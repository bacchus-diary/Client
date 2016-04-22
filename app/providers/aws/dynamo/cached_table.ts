import {Storage, LocalStorage} from 'ionic-angular';

import * as Base64 from '../../../util/base64';
import {Logger} from '../../../util/logging';

import * as DC from './document_client.d';
import {LAST_MODIFIED_COLUMN} from './dynamo';

const logger = new Logger('CachedTable');

const storageName = 'dynamo_cache';

export class CachedTable<R extends DC.Item> {
    constructor(private tableName: string, private idColumnName: string) {
        this.storage = new Storage(LocalStorage, { name: `${storageName}_${tableName}` });
    }

    private storage: Storage;

    async get(id: string): Promise<R> {
        const rec = await this.storage.get(id);
        return rec == null ? null : Base64.decodeJson(rec);
    }

    async put(obj: R): Promise<void> {
        await this.storage.set(obj[this.idColumnName], Base64.encodeJson(obj));
    }

    async remove(id: string): Promise<void> {
        await this.storage.remove(id);
    }
}
