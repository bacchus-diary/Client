import {Injectable} from "angular2/core";

import {Pager} from "../../../util/pager";
import {Logger} from "../../../util/logging";

import {AWS, requestToPromise} from "../aws";
import {Cognito} from "../cognito";
import {Configuration} from "../../config/configuration";
import {Photo} from "../../reports/photo";

import * as DC from "./document_client.d";
import {DynamoTable} from "./table";
import {ExpressionMap} from "./expression";

const logger = new Logger("Dynamo");

export const COGNITO_ID_COLUMN = "COGNITO_ID";
export const LAST_MODIFIED_COLUMN = "LAST_MODIFIED";

@Injectable()
export class Dynamo {
    constructor(private cognito: Cognito, private config: Configuration, private photo: Photo) {
        this.client = cognito.identity.then((x) =>
            new AWS.DynamoDB.DocumentClient({ dynamoDbCrc32: false }));
    }

    private client: Promise<DC.DocumentClient>;

    async createTable<R extends DC.Item, T extends DBRecord<T>>(maker: DBTableMaker<R, T>): Promise<DynamoTable<R, T>> {
        const m = maker(this.cognito, this.photo);
        const client = await this.client;
        const tableName = `${(await this.config.server).appName}.${m.tableName}`

        Cognito.addChangingHook(async (oldId, newId) => {
            const exp = new ExpressionMap();
            const expName = exp.addName(COGNITO_ID_COLUMN);
            const expValue = exp.addValue(oldId);
            const res = await toPromise(client.query({
                TableName: tableName,
                KeyConditionExpression: `${expName} = ${expValue}`,
                ExpressionAttributeNames: exp.names,
                ExpressionAttributeValues: exp.values
            }));
            await Promise.all(res.Items.map(async (item) => {
                try {
                    logger.debug(() => `Changing cognitoId of ${JSON.stringify(item)}`);
                    const key = _.pick(item, [COGNITO_ID_COLUMN, m.idColumnName]);
                    item[COGNITO_ID_COLUMN] = newId;

                    logger.debug(() => `Putting ${JSON.stringify(item)}`);
                    await toPromise(client.put({
                        TableName: tableName,
                        Item: item
                    }));

                    logger.debug(() => `Removing ${JSON.stringify(key)}`);
                    await toPromise(client.delete({
                        TableName: tableName,
                        Key: key
                    }))
                } catch (ex) {
                    logger.warn(() => `Error on moving ${tableName}: ${JSON.stringify(item)}`);
                }
            }));
            logger.debug(() => `Done changing cognitoId of ${tableName}`);
        });

        return new DynamoTable(
            this.cognito,
            client,
            tableName,
            m.idColumnName,
            m.reader,
            m.writer);
    }
}

export function createRandomKey(): string {
    const base = "0".codePointAt(0);
    const char = (c: number) => String.fromCharCode(base + ((9 < c) ? c + 7 : c));
    return _.range(32).map((i) => char(_.random(0, 35))).join("");
}

type DBTableMaker<R extends DC.Item, T extends DBRecord<T>> = (cognito: Cognito, photo: Photo) => {
    tableName: string,
    idColumnName: string,
    reader: RecordReader<R, T>,
    writer: RecordWriter<R, T>
}

export interface DBRecord<T> {
    id(): string;

    put(): Promise<void>;

    remove(): Promise<void>;
}

export type RecordReader<R extends DC.Item, T extends DBRecord<T>> = (src: R) => Promise<T>;
export type RecordWriter<R extends DC.Item, T extends DBRecord<T>> = (obj: T) => Promise<R>;

export function toPromise<R>(request: DC.AWSRequest<R>): Promise<R> {
    return requestToPromise<R>(request, "DynamoDB");
}
