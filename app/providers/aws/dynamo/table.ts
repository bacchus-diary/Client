import {Pager} from '../../../util/pager';
import {Logger} from '../../../util/logging';

import {Cognito} from '../cognito';

import * as DC from './document_client.d';
import {DBRecord, RecordReader, RecordWriter, COGNITO_ID_COLUMN, toPromise} from './dynamo';
import {Expression, ExpressionMap} from './expression';
import {PagingScan, PagingQuery, LastEvaluatedKey} from './pagination';

const logger = new Logger('DynamoTable');

export type TableKey = { [key: string]: string };

export class DynamoTable<T extends DBRecord<T>> {
    constructor(
        private cognito: Cognito,
        private client: DC.DocumentClient,
        private tableName: string,
        private ID_COLUMN: string,
        private reader: RecordReader<T>,
        private writer: RecordWriter<T>
    ) {
        logger.debug(() => `Initialized DynamoDB Table: ${this.tableName}`);
    }

    toString(): string {
        return `DynamoTable[${this.tableName}]`;
    }

    private async makeKey(id?: string): Promise<TableKey> {
        const key: TableKey = {};
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

    async query(keys?: TableKey, indexName?: string, isForward?: boolean, pageSize?: number, last?: LastEvaluatedKey): Promise<Array<T>> {
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

    queryPager(hashKey?: TableKey, indexName?: string, isForward?: boolean): Pager<T> {
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
