import {Injectable} from 'angular2/core';
import * as _ from 'lodash';

import {Logger} from '../../util/logging';

import {AWS, DynamoDB} from './aws';
import {Cognito} from './cognito';

const logger = new Logger(Dynamo);

const CONTENT = "CONTENT";
const COGNITO_ID = "COGNITO_ID";

@Injectable()
export class Dynamo {

    constructor(private cognito: Cognito) {
        this.client = cognito.identity.then((x) =>
            new AWS.DynamoDB({ dynamoDbCrc32: false }));
    }

    private client: Promise<DynamoDB>;

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
    readonly id: String;

    toMap(): Object;

    isNeedUpdate(other: T): boolean;

    clone(): T;
}

type RecordReader<T extends DBRecord<T>> = (src: Map<string, any>) => T;
type RecordWriter<T extends DBRecord<T>> = (obj: T) => Map<string, any>;

class DynamoTable<T extends DBRecord<T>> {
    constructor(
        private cognito: Cognito,
        private client: DynamoDB,
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

    private async invoke<T>(proc: (callback: (err, data: T) => void) => void): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            proc((err, data) => {
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

    private async makeKey(id: string, currentCognitoId?: string): Promise<Map<String, Map<string, string>>> {
        const key = new Map();
        key[COGNITO_ID] = {
            S: currentCognitoId ? currentCognitoId : (await this.cognito.identity).identityId
        };
        if (id && this.ID_COLUMN) {
            key[this.ID_COLUMN] = { S: id };
        }
        return key;
    }
}
