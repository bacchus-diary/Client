import {Storage, SqlStorage} from 'ionic-angular';
import {Injectable} from 'angular2/core';

import {Logger} from '../../util/logging';

const logger = new Logger(Preferences);

type PhotoTake = {
    always: boolean,
    count?: number
}

const COUNT_TAKE_THRESHOLD = 5;

@Injectable()
export class Preferences {
    constructor() {
        const storage = new Storage(SqlStorage, { name: 'preferences' });
        this.photoTake = new KeyValueJson<PhotoTake>(storage, 'photo_take', { always: false });
        this.social = new SocialConnections(storage, 'social_connections');
    }

    private photoTake: KeyValueJson<PhotoTake>;
    private social: SocialConnections;

    async getSocial(name: string): Promise<boolean> {
        const rows = await this.social.select(name);
        if (rows.length < 1) return false;
        const record = rows.item(0);
        return record.connected == 1;
    }
    async setSocial(name: string, v: boolean): Promise<void> {
        const rows = await this.social.select(name);
        if (0 < rows.length) {
            await this.social.update(name, v);
        } else {
            await this.social.insert(name, v);
        }
    }

    async getAlwaysTake(): Promise<boolean> {
        return (await this.photoTake.cache).always;
    }
    async setAlwaysTake(v: boolean): Promise<void> {
        (await this.photoTake.cache).always = v;
        if (!v) (await this.photoTake.cache).count = 0;
        await this.photoTake.save();
    }

    async getCountTake(): Promise<number> {
        return (await this.photoTake.cache).count || 0;
    }
    async incrementCountTake(): Promise<void> {
        if (!this.getAlwaysTake()) {
            const v = (await this.getCountTake()) + 1;
            (await this.photoTake.cache).count = v;
            logger.debug(() => `Incremented countTake: ${v}`);
            if (COUNT_TAKE_THRESHOLD <= v) {
                this.setAlwaysTake(true);
            }
            await this.photoTake.save();
        }
    }
    async clearCountTake(): Promise<void> {
        (await this.photoTake.cache).count = 0;
        await this.photoTake.save();
    }
}

class KeyValueJson<T> {
    constructor(private storage: Storage, private key: string, defaultValue: T) {
        this._cache = this.load(defaultValue);
    }

    private _cache: Promise<T>;

    get cache(): Promise<T> {
        return this._cache;
    }

    async load(defaultValue?: T): Promise<T> {
        let json: T;
        try {
            json = await this.storage.getJson(this.key);
        } catch (ex) {
            logger.warn(() => `Failed to get Local Storage ${this.key}: ${ex}`);
        }
        if (!json && defaultValue) {
            json = defaultValue;
            this.save(json);
        }
        logger.debug(() => `Loaded Local Storage ${this.key}: ${JSON.stringify(json)}`);
        return json;
    }

    async save(v?: T): Promise<void> {
        v = v || await this._cache;
        logger.debug(() => `Saving ${this.key}: ${JSON.stringify(v)}`);
        await this.storage.setJson(this.key, v);
    }
}

class SocialConnections {
    constructor(private storage: Storage, private tableName: string) {
        this.initialized = storage.query(`CREATE TABLE IF NOT EXISTS ${tableName} (name TEXT NOT NULL UNIQUE, connected INTEGER)`);
    }

    private initialized: Promise<void>;

    private async query(sql: string, values?: any[]): Promise<any> {
        try {
            await this.initialized;
            logger.debug(() => `Quering Local Storage: "${sql}" (values: ${values})`);
            return await this.storage.query(sql, values);
        } catch (ex) {
            logger.warn(() => `Error on "${sql}": ${JSON.stringify(ex, null, 4)}`);
            throw ex;
        }
    }

    async select(name: string): Promise<Rows> {
        const result = await this.query(`SELECT * FROM ${this.tableName} WHERE name = ?`, [name]);
        logger.debug(() => `Reading response from ${this.tableName}: ${result.res.rows.length}`);
        return result.res.rows;
    }

    async insert(name: string, v: boolean): Promise<void> {
        await this.query(`INSERT INTO ${this.tableName} (name, connected) VALUES (?, ?)`, [name, v ? 1 : 0]);
    }

    async update(name: string, v: boolean): Promise<void> {
        await this.query(`UPDATE ${this.tableName} SET connected = ? WHERE name = ?`, [v ? 1 : 0, name]);
    }

    async delete(name: string): Promise<void> {
        await this.query(`DELETE FROM ${this.tableName} WHERE name = ?`, [name]);
    }
}

interface Rows {
    length: number;
    item(i: number): SocialRecord;
}

type SocialRecord = {
    name: string,
    connected: number
}
