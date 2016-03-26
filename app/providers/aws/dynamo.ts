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

async function toPromise<R>(request: DC.AWSRequest<R>): Promise<R> {
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
            attrs[name] = {Action: 'PUT', Value: item[name]};
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
}
