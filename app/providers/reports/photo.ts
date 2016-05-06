import {Injectable} from "angular2/core";

import {Cognito} from "../aws/cognito";
import {Configuration} from "../config/configuration";
import {S3File} from "../aws/s3file";
import {Logger} from "../../util/logging";

const logger = new Logger("Photo");

const PATH_ORIGINAL = "original";
const PATH_REDUCED = "reduced";
const PATH_MAINVIEW = `${PATH_REDUCED}/mainview`;
const PATH_THUMBNAIL = `${PATH_REDUCED}/thumbnail`;

const localRefresh = 10 * 60 * 1000; // 10 minuites

@Injectable()
export class Photo {
    private static hookSetuped = false;

    constructor(private cognito: Cognito, private s3file: S3File, private config: Configuration) {
        if (!Photo.hookSetuped) {
            Cognito.addChangingHook(async (oldId, newId) => {
                await Promise.all([PATH_ORIGINAL, PATH_MAINVIEW, PATH_THUMBNAIL].map(async (relativePath) => {
                    const prev = `photo/${relativePath}/${oldId}/`;
                    const next = `photo/${relativePath}/${newId}/`;

                    const files = await this.s3file.list(prev);
                    logger.debug(() => `Moving image files(${files.length}): ${prev} => ${next}`);

                    await Promise.all(files.map(async (src) => {
                        const dst = `${next}${src.substring(prev.length)}`;
                        try {
                            await this.s3file.move(src, dst);
                        } catch (ex) {
                            logger.warn(() => `Error on moving S3 file: (${src} => ${dst}): ${ex}`);
                        }
                    }));
                }));
                logger.debug(() => `Done moving cognitoId of image files`);
            });
            Photo.hookSetuped = true;
            logger.info(() => `Photo cognitoId hook is set.`);
        }
    }

    async images(reportId: string, leafId: string, localUrl?: string): Promise<Images> {
        const expiring = (await this.config.server).photo.urlTimeout;
        return new Images(this.s3file, this.cognito, expiring, reportId, leafId, localUrl);
    }

    async cleanup(cond: (images: Images) => Promise<boolean>) {
        const cognitoId = (await this.cognito.identity).identityId;
        const check = (relativePath: string) => async (proc: (images: Images) => Promise<boolean>): Promise<void> => {
            const prefix = `photo/${relativePath}/${cognitoId}/`;
            const files = await this.s3file.list(prefix);
            await Promise.all(files.map(async (file) => {
                const st = Images.destractStoragePath(file);
                const ok = !_.isNil(st) && await proc(await this.images(st.reportId, st.leafId))
                if (!ok) {
                    await this.s3file.remove(file);
                }
            }));
        };
        await check(PATH_ORIGINAL)(cond);
        await Promise.all([PATH_MAINVIEW, PATH_THUMBNAIL].map(check).map(
            (check) => check((images) => images.exists())
        ));
    }
}

export class Images {
    static destractStoragePath(filePath: string): { relativePath: string, cognitoId: string, reportId: string, leafId: string } {
        const m = filePath.match('^photo/\((?:[^/]+\|[^/]+/[^/]+))/\([^/]+\)/\([^/]+\)/\([^/]+\)\.jpg$");
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
        private cognito: Cognito,
        public expiresInSeconds: number,
        private _reportId: string,
        private _leafId: string,
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

    get reportId(): string {
        return this._reportId;
    }
    get leafId(): string {
        return this._leafId;
    }

    async exists(): Promise<boolean> {
        return await this.s3file.exists(await this.original.storagePath);
    }

    async makeStoragePath(relativePath: string) {
        return `photo/${relativePath}/${(await this.cognito.identity).identityId}/${this.reportId}/${this.leafId}.jpg`;
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
            (this._url.startsWith("http') ?
                (await this.parent.expiresInSeconds) * 900 :
                localRefresh);
        setTimeout(() => {
            this.makingUrl = null;
        }, dur);
    }
}
