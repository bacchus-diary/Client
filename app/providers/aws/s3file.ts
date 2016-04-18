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

    async upload(path: string, blob: Blob): Promise<void> {
        const bucketName = await this.settings.s3Bucket;
        logger.debug(() => `Uploading file: ${bucketName}:${path}`);
        await this.invoke((s3) => s3.putObject({
            Bucket: bucketName,
            Key: path,
            Body: blob
        }));
    }

    async remove(path: string): Promise<void> {
        const bucketName = await this.settings.s3Bucket;
        logger.debug(() => `Removing file: ${bucketName}:${path}`);
        await this.invoke((s3) => s3.deleteObject({
            Bucket: bucketName,
            Key: path
        }));
    }

    async copy(src: string, dst: string): Promise<void> {
        const bucketName = await this.settings.s3Bucket;
        logger.debug(() => `Copying file: ${bucketName}:${src}=>${dst}`);
        await this.invoke((s3) => s3.copyObject({
            Bucket: bucketName,
            CopySource: `${bucketName}/${src}`,
            Key: dst}));
    }

    async move(src: string, dst: string): Promise<void> {
        await this.copy(src, dst);
        await this.remove(src);
    }

    async list(path: string): Promise<Array<string>> {
        const bucketName = await this.settings.s3Bucket;
        const res = await this.invoke<{Contents: {Key: string}[]}>((s3) => s3.listObjects({
            Bucket: bucketName,
            Prefix: path}));
        return res.Contents.map((x) => x.Key);
    }

    async exists(path: string): Promise<boolean> {
        const bucketName = await this.settings.s3Bucket;
        logger.debug(() => `Checking exists: ${bucketName}:${path}`);
        try {
            const res = await this.invoke<{ ContentLength: number }>((s3) => s3.headObject({
                Bucket: bucketName,
                Key: path
            }));
            return res.ContentLength > 0;
        } catch (ex) {
            return false;
        }
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
}
