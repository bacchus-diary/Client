import {Injectable} from 'angular2/core';

import {Pager} from '../../util/pager';
import {Logger} from '../../util/logging';

import {AWS, requestToPromise} from './aws';
import * as DC from './document_client.d';
import {Cognito} from './cognito';
import {Configuration} from '../config/configuration';
import {Photo} from '../reports/photo';

const logger = new Logger(Dynamo);

const COGNITO_ID_COLUMN = "COGNITO_ID";

@Injectable()
export class Dynamo {
    constructor(private cognito: Cognito, private config: Configuration, private photo: Photo) {
        this.client = cognito.identity.then((x) =>
            new AWS.DynamoDB.DocumentClient({ dynamoDbCrc32: false }));
    }

    private client: Promise<DC.DocumentClient>;

    async createTable<T extends DBRecord<T>>(maker: DBTableMaker<T>): Promise<DynamoTable<T>> {
        return new DynamoTable(
            this.cognito,
            await this.client,
            (await this.config.server).appName,
            maker.tableName,
            maker.idColumnName,
            maker.reader(this.cognito, this.photo),
            maker.writer(this.cognito, this.photo));
    }
}

export function createRandomKey(): string {
    const base = '0'.codePointAt(0);
    const char = (c: number) => String.fromCharCode(base + ((9 < c) ? c + 7 : c));
    return _.range(32).map((i) => char(_.random(0, 35))).join('');
}

interface DBTableMaker<T extends DBRecord<T>> {
    tableName: string;

    idColumnName: string;

    reader(cognito: Cognito, photo: Photo): RecordReader<T>;

    writer(cognito: Cognito, photo: Photo): RecordWriter<T>;
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
        appName: string,
        tableName: string,
        private ID_COLUMN: string,
        private reader: RecordReader<T>,
        private writer: RecordWriter<T>
    ) {
        this.tableName = `${appName}.${tableName}`;
        Cognito.addChangingHook(async (oldId, newId) => {
            const items = await this.query(toMap({ COGNITO_ID_COLUMN: oldId }));
            await Promise.all(items.map(async (item) => {
                await this.put(item, newId);
                await this.remove(item.id(), oldId);
            }));
        });
    }

    private tableName: string;

    toString(): string {
        return `DynamoTable[${this.tableName}]`;
    }

    private async makeKey(id?: string, currentCognitoId?: string): Promise<DC.Key> {
        const key = {};
        key[COGNITO_ID_COLUMN] = currentCognitoId ? currentCognitoId : (await this.cognito.identity).identityId;
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

    async put(obj: T, currentCognitoId?: string) {
        const params = {
            TableName: this.tableName,
            Item: await this.writer(obj)
        };
        const key = await this.makeKey(obj.id(), currentCognitoId);
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

    async remove(id: string, currentCognitoId?: string) {
        const params = {
            TableName: this.tableName,
            Key: await this.makeKey(id)
        };
        logger.debug(() => `Removing ${JSON.stringify(params)}`);

        await toPromise(this.client.delete(params));
    }

    async query(keys?: Map<string, any>, indexName?: string, isForward?: boolean, pageSize?: number, last?: LastEvaluatedKey): Promise<Array<T>> {
        logger.debug(() => `Quering ${indexName}: ${keys}`);
        const exp = ExpressionMap.joinAll(keys ? keys : toMap(await this.makeKey()));
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

    queryPager(hashKey?: Map<string, any>, indexName?: string, isForward?: boolean): Pager<T> {
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

        const res = await toPromise(this.client.scan(params));

        if (last) last.value = res.LastEvaluatedKey;

        return _.compact(await Promise.all(res.Items.map(this.reader)));
    }

    scanPager(exp: Expression): Pager<T> {
        return new PagingScan(this, exp);
    }
}

function isEmpty(obj: Object): boolean {
    return Object.keys(obj).length < 1;
}

function toObj(map: Map<string, any>): any {
    const result: any = {};
    Object.keys(map).forEach((key) => {
        result[key] = map[key];
    });
    return result;
}

function toMap(obj: any): Map<string, any> {
    const result = new Map<string, any>();
    Object.keys(obj).forEach((key) => {
        result[key] = obj[key];
    });
    return result;
}

class LastEvaluatedKey {
    private _value: DC.Item;

    get value(): DC.Item {
        return this._value;
    }

    set value(v: DC.Item) {
        logger.debug(() => `Loaded LastEvaluatedKey: ${JSON.stringify(v)}`)
        this._value = v ? v : {};
    }

    get isOver(): boolean {
        return this._value && isEmpty(this._value);
    }

    reset() {
        this._value = null;
    }
}

type Expression = {
    express: string,
    keys: {
        names: DC.ExpressionAttributeNames,
        values: DC.ExpressionAttributeValues
    }
};

class ExpressionMap {
    static joinAll(pairs: Map<string, any>, join?: string, sign?: string): Expression {
        if (!join) join = 'AND'
        if (!sign) sign = '=';
        const rels = new Array<string>();
        const result = new ExpressionMap();
        Object.keys(pairs).forEach((n) => {
            const name = result.addName(n);
            const value = result.addValue(pairs[n]);
            rels.push([name, sign, value].join(' '));
        });
        return { express: rels.join(` ${join} `), keys: result };
    }

    private _names: Map<string, string> = new Map();
    private _values: Map<string, any> = new Map();

    addName(name: string): string {
        const key = `#N${Object.keys(this._names).length}`;
        this._names[key] = name;
        return key;
    }

    addValue(value: any): string {
        const key = `:V${Object.keys(this._values).length}`;
        this._values[key] = value;
        return key;
    }

    get names(): DC.ExpressionAttributeNames {
        return toObj(this._names);
    }

    get values(): DC.ExpressionAttributeValues {
        return toObj(this._values);
    }
}

abstract class DBPager<T extends DBRecord<T>> implements Pager<T> {
    constructor(protected table: DynamoTable<T>) { }
    protected last: LastEvaluatedKey = new LastEvaluatedKey();
    private asking: Promise<Array<T>>;

    hasMore(): boolean {
        return !this.last.isOver;
    }

    reset() {
        this.last.reset();
    }

    async more(pageSize: number): Promise<Array<T>> {
        if (pageSize < 1 || !this.hasMore()) return [];
        if (this.asking) await this.asking;
        this.asking = this.doMore(pageSize);
        return await this.asking;
    }

    protected abstract async doMore(pageSize: number): Promise<Array<T>>;
}

class PagingQuery<T extends DBRecord<T>> extends DBPager<T> {
    constructor(
        table: DynamoTable<T>,
        private indexName: string,
        private hashKey: Map<string, any>,
        private isForward: boolean
    ) {
        super(table);
    }

    protected async doMore(pageSize: number): Promise<Array<T>> {
        return this.table.query(
            this.hashKey,
            this.indexName,
            this.isForward,
            pageSize,
            this.last
        );
    }
}

class PagingScan<T extends DBRecord<T>> extends DBPager<T> {
    constructor(
        table: DynamoTable<T>,
        private exp: Expression
    ) {
        super(table);
    }
    protected async doMore(pageSize: number): Promise<Array<T>> {
        return this.table.scan(
            this.exp,
            pageSize,
            this.last
        );
    }
}
