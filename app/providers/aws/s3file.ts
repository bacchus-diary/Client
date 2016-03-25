import {Injectable} from 'angular2/core';
import {Http} from 'angular2/http';

import {BootSettings} from '../config/boot_settings';
import {Logger} from '../../util/logging';
import {Cognito} from './cognito';

import {AWS, S3} from './aws';

const logger = new Logger(S3File);

@Injectable()
export class S3File {
    constructor(private settings: BootSettings, cognito: Cognito) {
        this.client = cognito.identity.then((x) => new AWS.S3());
    }

    private client: Promise<S3>;

    async read(path: string): Promise<string> {
        const s3 = await this.client;
        const bucketName = await this.settings.s3Bucket;
        logger.debug(() => `Reading test file: ${bucketName}:${path}`);
        return new Promise<string>((resolve, reject) => {
            s3.getObject({
                Bucket: bucketName,
                Key: path
            }, (err: any, data: any) => {
                if (err) {
                    logger.warn(() => `Error on getObject: ${JSON.stringify(err)}`);
                    reject(err);
                } else {
                    const body = data['Body'];
                    resolve(String.fromCharCode.apply(null, body));
                }
            });
        });
    }
}
