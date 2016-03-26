import {Injectable} from 'angular2/core';
import * as _ from 'lodash';

import {Logger} from '../../util/logging';

import {AWS} from './aws';
import * as DC from './document_client.d';
import {Cognito} from './cognito';

const logger = new Logger(Dynamo);

const CONTENT = "CONTENT";
const COGNITO_ID_COLUMN = "COGNITO_ID";

@Injectable()
export class Dynamo {

    constructor(private cognito: Cognito) {
        this.client = cognito.identity.then((x) =>
            new AWS.DynamoDB.DocumentClient({ dynamoDbCrc32: false }));
    }

    private client: Promise<DC.DocumentClient>;

    async createTable<T extends DBRecord<T>>(
        name: string,
        columnId: string,
        reader: RecordReader<T>,
        writer: RecordWriter<T>
    ): Promise<DynamoTable<T>> {
        return new DynamoTable(this.cognito, await this.client, name, columnId, reader, writer);
    }
}

function createRandomKey() {
    const base = '0'.codePointAt(0);
    const char = (c: number) => String.fromCharCode(base + ((9 < c) ? c + 7 : c));
    return _.range(32).map((i) => char(_.random(0, 35))).join();
}

export interface DBRecord<T> {
    id(): string;

    toMap(): Object;

    isNeedUpdate(other: T): boolean;

    clone(): T;
}

type RecordReader<T extends DBRecord<T>> = (src: DC.Item) => T;
type RecordWriter<T extends DBRecord<T>> = (obj: T) => DC.Item;

function toPromise<R>(request: DC.AWSRequest<R>): Promise<R> {
    return new Promise<R>((resolve, reject) => {
        request.send((err, data) => {
            if (err) {
                logger.warn(() => `Failed to call DynamoDB: ${err}`);
                reject(err);
            } else {
                logger.debug(() => `DynamoDB Result: ${JSON.stringify(data)}`);
                resolve(data);
            }
        });
    });
}

class DynamoTable<T extends DBRecord<T>> {
    constructor(
        private cognito: Cognito,
        private client: DC.DocumentClient,
        private tableName: string,
        private ID_COLUMN: string,
        private reader: RecordReader<T>,
        private writer: RecordWriter<T>
    ) {
        Cognito.addChangingHook(async (oldId, newId) => {
            // change id ...
        });
    }

    toString(): string {
        return `DynamoTable[${this.tableName}]`;
    }

    private async makeKey(id: string, currentCognitoId?: string): Promise<Object> {
        const key = {};
        key[COGNITO_ID_COLUMN] = currentCognitoId ? currentCognitoId : (await this.cognito.identity).identityId;
        if (id && this.ID_COLUMN) {
            key[this.ID_COLUMN] = id;
        }
        return key;
    }

    async get(id: string): Promise<T> {
        const res = await toPromise(this.client.get({
            TableName: this.tableName,
            Key: await this.makeKey(id)
        }));
        return this.reader(res.Item);
    }

    async put(obj: T, currentCognitoId?: string) {
        const item = this.writer(obj);
        const key = this.makeKey(obj.id(), currentCognitoId);
        Object.keys(key).forEach((name) => {
            item[name] = key[name];
        });
        const res = await toPromise(this.client.put({
            TableName: this.tableName,
            Item: item
        }));
    }

    async update(obj: T) {
        const item = this.writer(obj);
        delete item[COGNITO_ID_COLUMN];
        delete item[this.ID_COLUMN];

        const attrs = {};
        Object.keys(item).forEach((name) => {
            attrs[name] = { Action: 'PUT', Value: item[name] };
        });

        const res = await toPromise(this.client.update({
            TableName: this.tableName,
            Key: await this.makeKey(obj.id()),
            AttributeUpdates: attrs
        }))
    }

    async delete(id: string, currentCognitoId?: string) {
        const res = toPromise(this.client.delete({
            TableName: this.tableName,
            Key: await this.makeKey(id)
        }))
    }

    async query(indexName: string, keys: Map<string, any>, pageSize?: number, last?: LastEvaluatedKey, isForward?: boolean): Promise<Array<T>> {
        const exp = ExpressionMap.joinAll(keys);
        const params: DC.QueryParams = {
            TableName: this.tableName,
            ScanIndexForward: isForward,
            KeyConditionExpression: exp.express,
            ExpressionAttributeNames: exp.keys.getNames(),
            ExpressionAttributeValues: exp.keys.getValues()
        }
        if (indexName) params.IndexName = indexName;
        if (0 < pageSize) params.Limit = pageSize;
        if (last) params.ExclusiveStartKey = last.value;

        const res = await toPromise(this.client.query(params));

        if (last) res.LastEvaluatedKey = last.value;

        return res.Items.map(this.reader);
    }

    async scan(expression: string, names: DC.ExpressionAttributeNames, values: DC.ExpressionAttributeValues, pageSize?: number, last?: LastEvaluatedKey): Promise<Array<T>> {
        const params: DC.ScanParams = {
            TableName: this.tableName
        };
        if (expression && expression.length > 0) params.FilterExpression = expression;
        if (names && !isEmpty(names)) params.ExpressionAttributeNames = names;
        if (values && !isEmpty(values)) params.ExpressionAttributeValues = values;
        if (pageSize > 0) params.Limit = pageSize;
        if (last) params.ExclusiveStartKey = last.value;

        const res = await toPromise(this.client.scan(params));

        if (last) res.LastEvaluatedKey = last.value;

        return res.Items.map(this.reader);
    }
}

function isEmpty(obj: Object): boolean {
    return Object.keys(obj).length < 1;
}

class LastEvaluatedKey {
    private _value: DC.Item;

    get value(): DC.Item {
        return this._value;
    }

    set value(v: DC.Item) {
        this._value = v;
    }

    get isOver(): boolean {
        return this._value && isEmpty(this._value);
    }

    reset() {
        this._value = null;
    }
}

class ExpressionMap {
    static joinAll(pairs: Map<string, any>, join?: string, sign?: string): { express: string, keys: ExpressionMap } {
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

    private names: Map<string, string> = new Map();
    private values: Map<string, any> = new Map();

    addName(name: string): string {
        const key = `#N${Object.keys(this.names).length}`;
        this.names[key] = name;
        return key;
    }

    addValue(value: any): string {
        const key = `:V${Object.keys(this.values).length}`;
        this.values[key] = value;
        return key;
    }

    getNames(): DC.ExpressionAttributeNames {
        return this.names;
    }

    getValues(): DC.ExpressionAttributeValues {
        return this.values;
    }
}
