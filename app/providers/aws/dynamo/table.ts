import {Pager} from '../../../util/pager';
import {Logger} from '../../../util/logging';

import {Cognito} from '../cognito';

import * as DC from './document_client.d';
import {DBRecord, RecordReader, RecordWriter, COGNITO_ID_COLUMN, LAST_MODIFIED_COLUMN, toPromise} from './dynamo';
import {Expression, ExpressionMap} from './expression';
import {PagingScan, PagingQuery, LastEvaluatedKey} from './pagination';
import {CachedTable} from './cached_table';

const logger = new Logger('DynamoTable');

export type TableKey = { [key: string]: string };

function setLastModified<R extends DC.Item>(obj: R): R {
    if (!obj) return null;
    obj[LAST_MODIFIED_COLUMN] = new Date().getTime();
    return obj;
}

export class DynamoTable<R extends DC.Item, T extends DBRecord<T>> {
    constructor(
        private cognito: Cognito,
        private client: DC.DocumentClient,
        private tableName: string,
        private ID_COLUMN: string,
        private _reader: RecordReader<R, T>,
        private _writer: RecordWriter<R, T>
    ) {
        this.cache = new CachedTable<R>(_.snakeCase(tableName), ID_COLUMN);
        logger.debug(() => `Initialized DynamoDB Table: ${this.tableName}`);
    }

    private cache: CachedTable<R>;

    toString(): string {
        return `DynamoTable[${this.tableName}]`;
    }

    read(raw: R): Promise<T> {
        return raw == null ? null : this._reader(raw);
    }

    write(rec: T): Promise<R> {
        return rec == null ? null : this._writer(rec);
    }

    private async makeKey(id?: string): Promise<TableKey> {
        const key: TableKey = {};
        key[COGNITO_ID_COLUMN] = (await this.cognito.identity).identityId;
        if (id && this.ID_COLUMN) {
            key[this.ID_COLUMN] = id;
        }
        return key;
    }

    private async getItem(id: string): Promise<R> {
        const params = {
            TableName: this.tableName,
            Key: await this.makeKey(id)
        };

        logger.debug(() => `Getting Full: ${JSON.stringify(params)}`);
        const res = await toPromise(this.client.get(params));
        return res.Item;
    }

    private async doGet(id: string, getLastModified: () => Promise<number>): Promise<T> {
        const cached = await this.cache.get(id);
        if (cached != null) {
            const slm = await getLastModified() || 0;
            const clm = cached[LAST_MODIFIED_COLUMN] || 0;
            if (slm <= clm) {
                return this.read(cached);
            }
        }
        const item = await this.getItem(id);
        if (!item) return null;

        await Promise.all([
            cached ? this.cache.update(item) : this.cache.put(item),
            this.read(item)
        ]);
    }

    async get(id: string): Promise<T> {
        return this.doGet(id, async () => {
            const params = {
                TableName: this.tableName,
                Key: await this.makeKey(id),
                ProjectionExpression: [LAST_MODIFIED_COLUMN].join(',')
            }
            logger.debug(() => `Getting lastModified: ${JSON.stringify(params)}`);
            const res = await toPromise(this.client.get(params));
            return res.Item && res.Item[LAST_MODIFIED_COLUMN];
        });
    }

    async put(obj: T) {
        const item = setLastModified(await this.write(obj));
        const cached = await this.cache.get(obj.id());
        if (cached) {
            await this.update(item, cached);
        } else {
            const params = {
                TableName: this.tableName,
                Item: item as DC.Item
            };
            logger.debug(() => `Putting ${JSON.stringify(params)}`);

            await Promise.all([
                this.cache.put(item),
                toPromise(this.client.put(params))
            ]);
        }
    }

    private async update(item: R, cached?: R) {
        const attrs: DC.AttributeUpdates = {};
        Object.keys(item).filter((name) => {
            if (_.includes([COGNITO_ID_COLUMN, this.ID_COLUMN, LAST_MODIFIED_COLUMN], name)) return false;
            if (cached == null) return true;
            return JSON.stringify(cached[name]) != JSON.stringify(item[name]);
        }).forEach((name) => {
            attrs[name] = { Action: 'PUT', Value: item[name] };
        });

        if (!_.isEmpty(attrs)) {
            attrs[LAST_MODIFIED_COLUMN] = { Action: 'PUT', Value: item[LAST_MODIFIED_COLUMN] };
            const params = {
                TableName: this.tableName,
                Key: await this.makeKey(item[this.ID_COLUMN]),
                AttributeUpdates: attrs
            };
            logger.debug(() => `Updating ${JSON.stringify(params)}`);

            await Promise.all([
                cached ? this.cache.update(item) : this.cache.put(item),
                toPromise(this.client.update(params))
            ]);
        }
    }

    async remove(id: string) {
        const params = {
            TableName: this.tableName,
            Key: await this.makeKey(id)
        };
        logger.debug(() => `Removing ${JSON.stringify(params)}`);
        
        await Promise.all([
            this.cache.remove(id),
            toPromise(this.client.delete(params))
        ]);
    }

    private async select<P extends DC.QueryParams | DC.ScanParams, R extends DC.QueryResult | DC.ScanResult>(func: DC.Operation<P, R>, params: P, last?: LastEvaluatedKey): Promise<Array<T>> {
        params.ProjectionExpression = [LAST_MODIFIED_COLUMN, this.ID_COLUMN].join(',');
        if (last) params.ExclusiveStartKey = last.value;

        logger.debug(() => `Selecting: ${JSON.stringify(params)}`);
        const res = await toPromise(func(params));

        if (last) last.value = res.LastEvaluatedKey;

        const list = res.Items.map((h) =>
            this.doGet(h[this.ID_COLUMN], async () => h[LAST_MODIFIED_COLUMN]));
        return _.compact(await Promise.all(list));
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

        return this.select((p) => this.client.query(p), params, last);
    }

    queryPager(hashKey?: TableKey, indexName?: string, isForward?: boolean): Pager<T> {
        return new PagingQuery(this, indexName, hashKey, isForward);
    }

    async scan(exp: Expression, pageSize?: number, last?: LastEvaluatedKey): Promise<Array<T>> {
        const params: DC.ScanParams = {
            TableName: this.tableName,
            FilterExpression: exp.express,
            ExpressionAttributeNames: exp.keys.names,
            ExpressionAttributeValues: exp.keys.values
        };
        if (pageSize > 0) params.Limit = pageSize;

        return this.select((p) => this.client.scan(p), params, last);
    }

    scanPager(exp: Expression): Pager<T> {
        return new PagingScan(this, exp);
    }
}
