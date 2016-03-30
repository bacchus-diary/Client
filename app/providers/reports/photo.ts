import {Injectable} from 'angular2/core';

import {Cognito} from '../aws/cognito';
import {Configuration} from '../config/configuration';
import {S3File} from '../aws/s3file';
import {Logger} from '../../util/logging';

const logger = new Logger(Photo);

const PATH_ORIGINAL = 'original';
const PATH_REDUCED = 'reduced';
const PATH_MAINVIEW = `${PATH_REDUCED}/mainview`;
const PATH_THUMBNAIL = `${PATH_REDUCED}/thumbnail`;

const localRefresh = 10 * 60 * 1000; // 10 minuites

export type Images = {
    original: Image,
    reduced: {
        mainview: Image,
        thumbnail: Image
    }
};

@Injectable()
export class Photo {
    constructor(private cognito: Cognito, private s3file: S3File, private config: Configuration) { }

    images(reportId: string, leafId: string): Images {
        const newImage = (path: string) => new Image(this, reportId, leafId, path);
        return {
            original: newImage(PATH_ORIGINAL),
            reduced: {
                mainview: newImage(PATH_MAINVIEW),
                thumbnail: newImage(PATH_THUMBNAIL)
            }
        };
    }

    get cognitoId(): Promise<string> {
        return this.cognito.identity.then((x) => x.identityId);
    }

    get expiresInSeconds(): Promise<number> {
        return this.config.server.then((s) => s.photo.urlTimeout);
    }

    async makeUrl(path: string): Promise<string> {
        return await this.s3file.url(path, await this.expiresInSeconds);
    }
}

export class Image {
    constructor(
        private photo: Photo,
        private reportId: string,
        private leafId: string,
        private path: string) {
    }

    get storagePath(): Promise<string> {
        return this.photo.cognitoId.then((cognitoId) =>
            `photo/${this.path}/${cognitoId}/${this.reportId}/${this.leafId}.jpg`);
    }

    async makeUrl(): Promise<string> {
        return await this.photo.makeUrl(await this.storagePath);
    }

    private makingUrl: Promise<string>;
    private _url: string;
    get url(): string {
        if (!this.makingUrl) {
            this.makingUrl = this.makeUrl();
            this.makingUrl.then((v) => this.url = v);
        }
        return this._url;
    }
    set url(v: string) {
        if (!this.makingUrl) {
            this.makingUrl = Promise.resolve(v);
        }
        this._url = v;
        this.setClearTimer();
    }

    private async setClearTimer() {
        const dur = !this._url ? 0 :
            (this._url.startsWith('http') ?
                (await this.photo.expiresInSeconds) * 900 :
                localRefresh);
        setTimeout(() => {
            this.makingUrl = null;
        }, dur);
    }
}
