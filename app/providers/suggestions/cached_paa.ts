import {Storage, SqlStorage} from 'ionic-angular';

import {Logger} from '../../util/logging';

const logger = new Logger('CachedPAA');

const storageName = 'paa_cache';

export class CachedPAA<T> {
    constructor(
        private tableName: string,
        private maxAge: number,
        private getter: (keywords: string, pageIndex: number) => Promise<T>
    ) {
        this.table = new CachedRecordTable(new Storage(SqlStorage, { name: storageName }), this.tableName);
    }

    private table: CachedRecordTable;

    async get(keywords: string, pageIndex: number): Promise<T> {
        const id = CachedRecordTable.encode({ keywords: keywords, pageIndex: pageIndex });
        const cache = await this.table.get(id);
        if (cache != null) {
            const timeLimit = new Date().getTime() + this.maxAge;
            if (cache.lastUpdate < timeLimit) {
                return CachedRecordTable.decode(cache.base64json);
            }
        }
        const result = await this.getter(keywords, pageIndex);
        const rec: CachedRecord = {
            id: id,
            lastUpdate: new Date().getTime(),
            base64json: CachedRecordTable.encode(result)
        }
        await (cache ? this.table.update(rec) : this.table.put(rec));
        return result;
    }
}

type CachedRecord = {
    id: string,
    lastUpdate: number,
    base64json: string
}

class CachedRecordTable {
    static encode(obj: any): string {
        return btoa(encodeURIComponent(JSON.stringify(obj)));
    }

    static decode(base64: string): any {
        return JSON.parse(decodeURIComponent(atob(base64)));
    }

    constructor(private storage: Storage, private tableName: string) {
        const columns = [
            'id TEXT NOT NULL PRIMARY KEY',
            'lastUpdate INTEGER NOT NULL',
            'base64json TEXT NOT NULL'
        ].join(',');
        const sql = `CREATE TABLE IF NOT EXISTS ${this.tableName} (${columns})`;
        this.initialized = storage.query(sql);
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

    async get(id: string): Promise<CachedRecord> {
        const result = await this.query(`SELECT * FROM ${this.tableName} WHERE id = ?`, [id]);
        const rows = result.res.rows;
        logger.debug(() => `Reading response from ${this.tableName}: ${rows.length}`);
        if (rows.length != 1) return null;
        return rows.item(0);
    }

    async put(rec: CachedRecord): Promise<void> {
        await this.query(`INSERT INTO ${this.tableName} (id, lastUpdate, base64json) VALUES (?, ?, ?)`,
            [rec.id, rec.lastUpdate, rec.base64json]);
    }

    async update(rec: CachedRecord): Promise<void> {
        await this.query(`UPDATE ${this.tableName} SET lastUpdate = ?, base64json = ? WHERE id = ?`,
            [rec.lastUpdate, rec.base64json, rec.id]);
    }

    async remove(id: string): Promise<void> {
        await this.query(`DELETE FROM ${this.tableName} WHERE id = ?`, [id]);
    }
}
