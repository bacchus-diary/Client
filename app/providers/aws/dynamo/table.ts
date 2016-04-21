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

function setLastModified(obj: any) {
    if (!obj) return null;
    obj[LAST_MODIFIED_COLUMN] = new Date().getTime();
    return obj;
}

export class DynamoTable<T extends DBRecord<T>> {
    constructor(
        private cognito: Cognito,
        private client: DC.DocumentClient,
        private tableName: string,
        private ID_COLUMN: string,
        private reader: RecordReader<T>,
        private writer: RecordWriter<T>
    ) {
        this.cache = new CachedTable(_.snakeCase(tableName), ID_COLUMN);
        logger.debug(() => `Initialized DynamoDB Table: ${this.tableName}`);
    }

    private cache: CachedTable;

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

    private async getItem(id: string): Promise<DC.Item> {
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
            const lastModified = await getLastModified();
            if (!lastModified || lastModified <= cached[LAST_MODIFIED_COLUMN]) {
                return this.reader(cached);
            }
        }
        const item = setLastModified(await this.getItem(id));
        if (!item) return null;

        if (cached) {
            this.cache.update(item);
        } else {
            this.cache.put(item);
        }
        return this.reader(item);
    }

    async get(id: string): Promise<T> {
        return this.doGet(id, async () => {
            const params = {
                TableName: this.tableName,
                Key: await this.makeKey(id),
                AttributesToGet: [LAST_MODIFIED_COLUMN]
            }
            logger.debug(() => `Getting lastModified: ${JSON.stringify(params)}`);
            const res = await toPromise(this.client.get(params));
            return res.Item && res.Item[LAST_MODIFIED_COLUMN];
        });
    }

    async put(obj: T) {
        const item = setLastModified(await this.writer(obj));
        this.cache.put(item);

        const params = {
            TableName: this.tableName,
            Item: _.merge(item, await this.makeKey(obj.id()))
        };

        logger.debug(() => `Putting ${JSON.stringify(params)}`);
        await toPromise(this.client.put(params));
    }

    async update(obj: T) {
        const item = setLastModified(await this.writer(obj));
        const cached = await this.cache.get(obj.id());

        const attrs: DC.AttributeUpdates = {};
        Object.keys(item).filter((name) => {
            if (cached == null) return true;
            if (name in [COGNITO_ID_COLUMN, this.ID_COLUMN, LAST_MODIFIED_COLUMN]) return true;
            return JSON.stringify(cached[name]) != JSON.stringify(item[name]);
        }).forEach((name) => {
            attrs[name] = { Action: 'PUT', Value: item[name] };
        });

        if (!_.isEmpty(attrs)) {
            if (cached) {
                this.cache.update(item);
            } else {
                this.cache.put(item);
            }

            attrs[LAST_MODIFIED_COLUMN] = { Action: 'PUT', Value: item[LAST_MODIFIED_COLUMN] };
            const params = {
                TableName: this.tableName,
                Key: await this.makeKey(obj.id()),
                AttributeUpdates: attrs
            };

            logger.debug(() => `Updating ${JSON.stringify(params)}`);
            await toPromise(this.client.update(params))
        }
    }

    async remove(id: string) {
        this.cache.remove(id);

        const params = {
            TableName: this.tableName,
            Key: await this.makeKey(id)
        };

        logger.debug(() => `Removing ${JSON.stringify(params)}`);
        await toPromise(this.client.delete(params));
    }

    private async select<P extends DC.QueryParams | DC.ScanParams, R extends DC.QueryResult | DC.ScanResult>(func: DC.Operation<P, R>, params: P, last?: LastEvaluatedKey): Promise<Array<T>> {
        params.AttributesToGet = [LAST_MODIFIED_COLUMN, this.ID_COLUMN];
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

        return this.select(this.client.query, params, last);
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

        return this.select(this.client.scan, params, last);
    }

    scanPager(exp: Expression): Pager<T> {
        return new PagingScan(this, exp);
    }
}
