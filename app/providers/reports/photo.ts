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

@Injectable()
export class Photo {
    private static hookSetuped = false;

    constructor(private cognito: Cognito, private s3file: S3File, private config: Configuration) {
        if (!Photo.hookSetuped) {
            Cognito.addChangingHook(this.changeCognitoId);
            Photo.hookSetuped = true;
            logger.info(() => `Photo cognitoId hook is set.`);
        }
    }

    async images(reportId: string, leafId: string, localUrl?: string): Promise<Images> {
        const cognitoId = (await this.cognito.identity).identityId;
        const expiring = (await this.config.server).photo.urlTimeout;
        return new Images(this.s3file, cognitoId, expiring, reportId, leafId, localUrl);
    }

    async cleanup(cond: (file: string) => Promise<boolean>) {
        const cognitoId = (await this.cognito.identity).identityId;
        await Promise.all([PATH_ORIGINAL, PATH_MAINVIEW, PATH_THUMBNAIL].map(async (relativePath) => {
            const prefix = `photo/${relativePath}/${cognitoId}/`;
            const files = await this.s3file.list(prefix);
            await Promise.all(files.map(async (file) => {
                const del = await cond(file)
                if (del) {
                    await this.s3file.remove(file);
                }
            }));
        }));
    }

    private async changeCognitoId(oldId, newId) {
        await Promise.all([PATH_ORIGINAL, PATH_MAINVIEW, PATH_THUMBNAIL].map(async (relativePath) => {
            const prev = `photo/${relativePath}/${oldId}/`;
            const next = `photo/${relativePath}/${newId}/`;
            logger.debug(() => `Moving image file: ${prev} => ${next}`);

            const files = await this.s3file.list(prev);
            await Promise.all(files.map(async (src) => {
                const dst = `${next}${src.substring(prev.length)}`;
                try {
                    await this.s3file.move(src, dst);
                } catch (ex) {
                    logger.warn(() => `Error on moving S3 file: (${src} => ${dst}): ${ex}`);
                }
            }));
        }));
    }
}

export class Images {
    static destractStoragePath(filePath: string): { relativePath: string, cognitoId: string, reportId: string, leafId: string } {
        const m = filePath.match(`^photo/\([^/]+\)/\([^/]+\)/\([^/]+\)/\([^/]+\)\.jpg$`);
        if (!m) return null;
        return {
            relativePath: m[1],
            cognitoId: m[2],
            reportId: m[3],
            leafId: m[4]
        }
    }

    constructor(
        private s3file: S3File,
        private cognitoId: string,
        public expiresInSeconds: number,
        private reportId: string,
        private leafId: string,
        localUrl: string
    ) {
        const newImage = (path: string, parent?: Image) => new Image(this, path, localUrl);
        this.original = newImage(PATH_ORIGINAL);
        this.reduced = {
            mainview: newImage(PATH_MAINVIEW, this.original),
            thumbnail: newImage(PATH_THUMBNAIL, this.original)
        };
    }
    original: Image;
    reduced: {
        mainview: Image,
        thumbnail: Image
    };

    async exists(): Promise<boolean> {
        return await this.s3file.exists(await this.original.storagePath);
    }

    async makeStoragePath(relativePath: string) {
        return `photo/${relativePath}/${this.cognitoId}/${this.reportId}/${this.leafId}.jpg`;
    }

    async makeUrl(relativePath: string) {
        const path = await this.makeStoragePath(relativePath);
        const target = (await this.s3file.exists(path)) ?
            path :
            await this.original.storagePath;
        return await this.s3file.url(target, this.expiresInSeconds);
    }

    async remove() {
        const paths = [
            this.original.storagePath,
            this.reduced.mainview.storagePath,
            this.reduced.thumbnail.storagePath
        ];
        await Promise.all(paths.map(async (path) => this.s3file.remove(await path)));
    }
}

export class Image {
    constructor(
        private parent: Images,
        private relativePath: string,
        localUrl: string
    ) {
        if (localUrl) {
            this.setUrl(localUrl);
        } else {
            const waste = this.url; // 予め URL を取得しておく
        }
    }

    get storagePath(): Promise<string> {
        return this.parent.makeStoragePath(this.relativePath);
    }

    async makeUrl(): Promise<string> {
        return this.parent.makeUrl(this.relativePath);
    }

    private makingUrl: Promise<string>;
    private _url: string;
    get url(): string {
        if (!this.makingUrl) {
            this.makingUrl = this.makeUrl();
            this.makingUrl.then((v) => this.setUrl(v));
        }
        return this._url;
    }
    private setUrl(v: string) {
        if (!this.makingUrl) {
            this.makingUrl = Promise.resolve(v);
        }
        this._url = v;
        this.setClearTimer();
    }

    private async setClearTimer() {
        const dur = !this._url ? 0 :
            (this._url.startsWith('http') ?
                (await this.parent.expiresInSeconds) * 900 :
                localRefresh);
        setTimeout(() => {
            this.makingUrl = null;
        }, dur);
    }
}
