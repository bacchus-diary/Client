import {Injectable} from 'angular2/core';

import {Pager} from '../../../util/pager';
import {Logger} from '../../../util/logging';

import {AWS, requestToPromise} from '../aws';
import {Cognito} from '../cognito';
import {Configuration} from '../../config/configuration';
import {Photo} from '../../reports/photo';

import * as DC from './document_client.d';
import {Expression, ExpressionMap, Key} from './expression';
import {PagingScan, PagingQuery, LastEvaluatedKey} from './pagination';

const logger = new Logger(Dynamo);

export const COGNITO_ID_COLUMN = "COGNITO_ID";

@Injectable()
export class Dynamo {
    constructor(private cognito: Cognito, private config: Configuration, private photo: Photo) {
        this.client = cognito.identity.then((x) =>
            new AWS.DynamoDB.DocumentClient({ dynamoDbCrc32: false }));
    }

    private client: Promise<DC.DocumentClient>;

    async createTable<T extends DBRecord<T>>(maker: DBTableMaker<T>): Promise<DynamoTable<T>> {
        const m = maker(this.cognito, this.photo);
        return new DynamoTable(
            this.cognito,
            await this.client,
            (await this.config.server).appName,
            m.tableName,
            m.idColumnName,
            m.reader,
            m.writer);
    }
}

export function createRandomKey(): string {
    const base = '0'.codePointAt(0);
    const char = (c: number) => String.fromCharCode(base + ((9 < c) ? c + 7 : c));
    return _.range(32).map((i) => char(_.random(0, 35))).join('');
}

type DBTableMaker<T extends DBRecord<T>> = (cognito: Cognito, photo: Photo) => {
    tableName: string,
    idColumnName: string,
    reader: RecordReader<T>,
    writer: RecordWriter<T>
}

export interface DBRecord<T> {
    id(): string;

    toMap(): Object;

    isNeedUpdate(other: T): boolean;

    clone(): T;

    add(): Promise<void>;

    remove(): Promise<void>;

    update(dst: T): Promise<void>
}

export type RecordReader<T extends DBRecord<T>> = (src: DC.Item) => Promise<T>;
export type RecordWriter<T extends DBRecord<T>> = (obj: T) => Promise<DC.Item>;

function toPromise<R>(request: DC.AWSRequest<R>): Promise<R> {
    return requestToPromise<R>(request, 'DynamoDB');
}

export class DynamoTable<T extends DBRecord<T>> {
    constructor(
        private cognito: Cognito,
        private client: DC.DocumentClient,
        _appName: string,
        _tableName: string,
        private ID_COLUMN: string,
        private reader: RecordReader<T>,
        private writer: RecordWriter<T>
    ) {
        this.tableName = `${_appName}.${_tableName}`;

        Cognito.addChangingHook(async (oldId, newId) => {
            const exp = new ExpressionMap();
            const expName = exp.addName(COGNITO_ID_COLUMN);
            const expValue = exp.addValue(oldId);
            const res = await toPromise(this.client.query({
                TableName: this.tableName,
                KeyConditionExpression: `${expName} = ${expValue}`,
                ExpressionAttributeNames: exp.names,
                ExpressionAttributeValues: exp.values
            }));
            await Promise.all(res.Items.map(async (item) => {
                try {
                    logger.debug(() => `Changing cognitoId of ${JSON.stringify(item)}`);
                    const key = _.pick(item, [COGNITO_ID_COLUMN, ID_COLUMN]);
                    item[COGNITO_ID_COLUMN] = newId;

                    logger.debug(() => `Putting ${JSON.stringify(item)}`);
                    await toPromise(this.client.put({
                        TableName: this.tableName,
                        Item: item
                    }));

                    logger.debug(() => `Removing ${JSON.stringify(key)}`);
                    await toPromise(this.client.delete({
                        TableName: this.tableName,
                        Key: key
                    }))
                } catch (ex) {
                    logger.warn(() => `Error on moving ${this.tableName}: ${JSON.stringify(item)}`);
                }
            }));
            logger.debug(() => `Done changing cognitoId of ${this.tableName}`);
        });
        logger.debug(() => `Initialized DynamoDB Table: ${this.tableName}`);
    }

    private tableName: string;

    toString(): string {
        return `DynamoTable[${this.tableName}]`;
    }

    private async makeKey(id?: string): Promise<Key> {
        const key: Key = {};
        key[COGNITO_ID_COLUMN] = (await this.cognito.identity).identityId;
        if (id && this.ID_COLUMN) {
            key[this.ID_COLUMN] = id;
        }
        return key;
    }

    async get(id: string): Promise<T> {
        const params = {
            TableName: this.tableName,
            Key: await this.makeKey(id)
        };

        logger.debug(() => `Getting: ${JSON.stringify(params)}`);
        const res = await toPromise(this.client.get(params));
        return this.reader(res.Item);
    }

    async put(obj: T) {
        const params = {
            TableName: this.tableName,
            Item: await this.writer(obj)
        };
        const key = await this.makeKey(obj.id());
        Object.keys(key).forEach((name) => {
            params.Item[name] = key[name];
        });

        logger.debug(() => `Putting ${JSON.stringify(params)}`);
        await toPromise(this.client.put(params));
    }

    async update(obj: T) {
        const item = await this.writer(obj);
        delete item[COGNITO_ID_COLUMN];
        delete item[this.ID_COLUMN];

        const params = {
            TableName: this.tableName,
            Key: await this.makeKey(obj.id()),
            AttributeUpdates: {}
        };
        Object.keys(item).forEach((name) => {
            params.AttributeUpdates[name] = { Action: 'PUT', Value: item[name] };
        });

        logger.debug(() => `Updating ${JSON.stringify(params)}`);
        await toPromise(this.client.update(params))
    }

    async remove(id: string) {
        const params = {
            TableName: this.tableName,
            Key: await this.makeKey(id)
        };

        logger.debug(() => `Removing ${JSON.stringify(params)}`);
        await toPromise(this.client.delete(params));
    }

    async query(keys?: Key, indexName?: string, isForward?: boolean, pageSize?: number, last?: LastEvaluatedKey): Promise<Array<T>> {
        const exp = ExpressionMap.joinAll(keys || await this.makeKey());
        const params: DC.QueryParams = {
            TableName: this.tableName,
            KeyConditionExpression: exp.express,
            ExpressionAttributeNames: exp.keys.names,
            ExpressionAttributeValues: exp.keys.values,
            ScanIndexForward: isForward != null ? isForward : true
        };
        if (indexName) params.IndexName = indexName;
        if (0 < pageSize) params.Limit = pageSize;
        if (last) params.ExclusiveStartKey = last.value;

        logger.debug(() => `Quering: ${JSON.stringify(params)}`);
        const res = await toPromise(this.client.query(params));

        if (last) last.value = res.LastEvaluatedKey;

        return _.compact(await Promise.all(res.Items.map(this.reader)));
    }

    queryPager(hashKey?: Key, indexName?: string, isForward?: boolean): Pager<T> {
        return new PagingQuery<T>(this, indexName, hashKey, isForward);
    }

    async scan(exp: Expression, pageSize?: number, last?: LastEvaluatedKey): Promise<Array<T>> {
        const params: DC.ScanParams = {
            TableName: this.tableName,
            FilterExpression: exp.express,
            ExpressionAttributeNames: exp.keys.names,
            ExpressionAttributeValues: exp.keys.values
        };
        if (pageSize > 0) params.Limit = pageSize;
        if (last) params.ExclusiveStartKey = last.value;

        logger.debug(() => `Scaning: ${JSON.stringify(params)}`);
        const res = await toPromise(this.client.scan(params));

        if (last) last.value = res.LastEvaluatedKey;

        return _.compact(await Promise.all(res.Items.map(this.reader)));
    }

    scanPager(exp: Expression): Pager<T> {
        return new PagingScan(this, exp);
    }
}
