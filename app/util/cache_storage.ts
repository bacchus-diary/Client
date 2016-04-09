import {Storage, SqlStorage} from 'ionic-angular';

import {Logger} from './logging';

const logger = new Logger(CacheStorage);

type KeyTypes = { [key: string]: ColumnType; };

type ColumnType = string | number;

function columnType(v: ColumnType): string {
    return {
        string: 'TEXT',
        number: 'INTEGER'
    }[typeof v];
}

function quote(v: ColumnType): string {
    return ('string' == typeof v) ? `'${v}'` : v.toString();
}

export class CacheStorage<K, T> {
    constructor(
        private storageName: string,
        private tableName: string,
        private maxAge: number,
        keys: K,
        private getter: (keys: K) => Promise<T>
    ) {
        this.storage = this.init(keys);
    }

    private storage: Promise<Storage>;

    private async init(keys: K): Promise<Storage> {
        const storage = new Storage(SqlStorage, { name: this.storageName });
        const c = this.makeRecord(keys);
        const columns = Object.keys(c).map((name) => `${name} ${columnType(c[name])}`).join(', ');
        const sql = `CREATE TABLE IF NOT EXISTS ${this.tableName} (${columns})`;
        logger.debug(() => `CacheStorage(${this.storageName}): ${sql}`);
        await storage.query(sql);
        return storage;
    }

    private makeRecord(keys: K, obj?: any): any {
        const c = {
            timestamp: new Date().getTime(),
            json: JSON.stringify(obj || {}).replace(/'/g, "''")
        }
        return _.merge(c, keys);
    }

    private async query(sql: string, values?: any[]): Promise<any> {
        try {
            logger.debug(() => `Querying to SqlStorage: ${sql} (with: ${values})`);
            return await (await this.storage).query(sql, values);
        } catch (ex) {
            logger.warn(() => `Failed to SQL: ${JSON.stringify(ex)}`);
            throw ex;
        }
    }

    private async getCache(keys: K): Promise<T> {
        const constraint = Object.keys(keys).map((name) => `${name} = ?`).join(' AND ');
        const sql = `SELECT * FROM ${this.tableName} WHERE ${constraint}`;
        const values = Object.keys(keys).map((name) => keys[name]);

        const rows = (await this.query(sql, values)).res.rows;
        if (rows.length > 0) {
            const record = rows.item(0);
            logger.info(() => `Checking timestamp of cache: ${JSON.stringify(record, null, 4)}`);
            const timeLimit = new Date().getTime() + this.maxAge;
            if (record.timestamp < timeLimit) {
                return JSON.parse(record.json);
            }
            await this.query(`DELETE FROM ${this.tableName} WHERE ${constraint}`, values);
        }
        return null;
    }

    private async setCache(keys: K, result: T): Promise<void> {
        const c = this.makeRecord(keys, result);

        const names = Object.keys(c).map((name) => name).join(', ');
        const values = Object.keys(c).map((name) => quote(c[name])).join(', ');

        await this.query(`INSERT INTO ${this.tableName} (${names}) VALUES (${values})`);
    }

    async get(keys: K): Promise<T> {
        try {
            const cache = await this.getCache(keys);
            if (cache != null) return cache;
        } catch (ex) {
        }
        const result = await this.getter(keys);
        try {
            await this.setCache(keys, result);
        } catch (ex) {
        }
        return result;
    }
}
