import {Storage, LocalStorage} from 'ionic-angular';

import * as Base64 from '../../util/base64';
import {Logger} from '../../util/logging';

const logger = new Logger('CachedPAA');

const storageName = 'paa_cache';

export class CachedPAA<T> {
    constructor(
        private tableName: string,
        private maxAge: number,
        private getter: (keywords: string, pageIndex: number) => Promise<T>
    ) {
        this.storage = new Storage(LocalStorage, { name: `${storageName}_${this.tableName}` });
    }

    private storage: Storage;

    async get(keywords: string, pageIndex: number): Promise<T> {
        const id = Base64.encodeJson({ keywords: keywords, pageIndex: pageIndex });
        const cache = await this.storage.getJson(id) as CachedRecord;
        if (cache != null) {
            const timeLimit = new Date().getTime() + this.maxAge;
            if (cache.lastUpdate < timeLimit) {
                return Base64.decodeJson(cache.base64json);
            }
        }
        const result = await this.getter(keywords, pageIndex);
        const rec: CachedRecord = {
            lastUpdate: new Date().getTime(),
            base64json: Base64.encodeJson(result)
        }
        await this.storage.setJson(id, rec);
        return result;
    }
}

type CachedRecord = {
    lastUpdate: number,
    base64json: string
}
