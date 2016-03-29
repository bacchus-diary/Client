import {Injectable} from 'angular2/core';
import {Http} from 'angular2/http';

import {BootSettings} from '../config/boot_settings';
import {Logger} from '../../util/logging';
import {Cognito} from './cognito';

import {AWS, S3, AWSRequest, requestToPromise} from './aws';

const logger = new Logger(S3File);

@Injectable()
export class S3File {
    constructor(private settings: BootSettings, cognito: Cognito) {
        this.client = cognito.identity.then((x) => new AWS.S3());
    }

    async url(path: string, expiresInSeconds: number): Promise<string> {
        const s3: any = await this.client;
        const bucketName = await this.settings.s3Bucket;
        logger.debug(() => `Getting url of file: ${bucketName}:${path}`);
        try {
            return s3.getSignedUrl('getObject', {
                Bucket: bucketName,
                Key: path,
                Expires: expiresInSeconds
            });
        } catch (ex) {
            logger.warn(() => `Error on getting url: ${ex}`);
        }
    }

    private client: Promise<S3>;

    private async invoke<R>(proc: (s3client) => AWSRequest): Promise<R> {
        return requestToPromise<R>(proc(await this.client));
    }

    async read(path: string): Promise<string> {
        const bucketName = await this.settings.s3Bucket;
        logger.debug(() => `Reading file: ${bucketName}:${path}`);
        const res = await this.invoke<{ Body: number[] }>((s3) => s3.getObject({
            Bucket: bucketName,
            Key: path
        }));
        return String.fromCharCode.apply(null, res.Body);
    }
}
