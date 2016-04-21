import SDK = require('aws-sdk');
import {Logger} from '../../util/logging';

console.log(`aws-sdk = ${SDK}`);

export * from 'aws-sdk';
export const AWS = (window as any).AWS;

const logger = new Logger('AWS');

export interface AWSRequest {
    send(callback: (err, data) => void): void;
}

export function requestToPromise<R>(request: AWSRequest, title?: string): Promise<R> {
    return new Promise<R>((resolve, reject) => {
        request.send((err, data) => {
            if (err) {
                if (title) logger.warn(() => `${title}: Failed to call: ${err}`);
                reject(err);
            } else {
                if (title) logger.debug(() => `${title}: Result: ${JSON.stringify(data)}`);
                resolve(data);
            }
        });
    });
}
