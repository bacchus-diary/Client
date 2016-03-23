import {Injectable} from 'angular2/core';
import {Http} from 'angular2/http';
import SDK = require('aws-sdk');
const AWS = window.AWS;

import {BootSettings} from '../config/boot_settings';
import {Logger} from '../../util/logging';

const logger = new Logger(S3File);

@Injectable()
export class S3File {
    constructor(private settings: BootSettings) { }

    async read(path: string): Promise<string> {
        const bucketName = await this.settings.s3Bucket;
        logger.debug(() => `Reading test file: ${bucketName}:${path}`);
        logger.debug(() => `AWS = ${AWS}, S3 = ${AWS.S3},${SDK.S3}`);
        const s3: SDK.S3 = new AWS.S3();
        logger.debug(() => `s3: ${s3}`);
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
