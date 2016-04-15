import {Storage, SqlStorage} from 'ionic-angular';
import {Injectable} from 'angular2/core';

import {Logger} from '../../util/logging';

const logger = new Logger(Preferences);

type PrefObj = {
    photo: {
        alwaysTake: boolean,
        countTake?: number
    }
};

const key = 'preferences';

const COUNT_TAKE_THRESHOLD = 5;

@Injectable()
export class Preferences {
    constructor() {
        this.storage = new Storage(SqlStorage);
        this.cache = this.load();
        this.social = new SocialConnections(this.storage, 'social_connections');
    }

    private storage: Storage;
    private cache: Promise<PrefObj>;
    private social: SocialConnections;

    private async load(): Promise<PrefObj> {
        let json: PrefObj;
        try {
            json = await this.storage.getJson(key)
        } catch (ex) {
            logger.warn(() => `Failed to get preferences: ${ex}`);
        }
        if (!json) {
            json = {
                photo: {
                    alwaysTake: false
                }
            };
            this.save(json);
        }
        logger.debug(() => `Loaded preferences: ${JSON.stringify(json)}`);
        return json;
    }

    private async save(pref?: PrefObj): Promise<void> {
        pref = pref || await this.cache;
        logger.debug(() => `Saving preferences: ${JSON.stringify(pref)}`);
        await this.storage.setJson(key, pref);
    }

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
        return (await this.cache).photo.alwaysTake;
    }
    async setAlwaysTake(v: boolean): Promise<void> {
        (await this.cache).photo.alwaysTake = v;
        if (!v) (await this.cache).photo.countTake = 0;
        await this.save();
    }

    async getCountTake(): Promise<number> {
        return (await this.cache).photo.countTake || 0;
    }
    async incrementCountTake(): Promise<void> {
        if (!this.getAlwaysTake()) {
            const v = (await this.getCountTake()) + 1;
            (await this.cache).photo.countTake = v;
            logger.debug(() => `Incremented countTake: ${v}`);
            if (COUNT_TAKE_THRESHOLD <= v) {
                this.setAlwaysTake(true);
            }
            await this.save();
        }
    }
    async clearCountTake(): Promise<void> {
        (await this.cache).photo.countTake = 0;
        await this.save();
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
