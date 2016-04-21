import {Storage, SqlStorage} from 'ionic-angular';

import {Logger} from '../../../util/logging';

import * as DC from './document_client.d';
import {LAST_MODIFIED_COLUMN} from './dynamo';

const logger = new Logger('CachedTable');

const storageName = 'dynamo_cache';

export class CachedTable {
    constructor(private tableName: string, private idColumnName: string) {
        const storage = new Storage(SqlStorage, { name: storageName });
        this.table = new CachedRecordTable(storage, tableName);
    }

    private table: CachedRecordTable;

    private toRec(obj: DC.Item): CachedRecord {
        return {
            id: obj[this.idColumnName],
            lastModified: obj[LAST_MODIFIED_COLUMN],
            base64json: encode(obj)
        };
    }

    async get(id: string): Promise<DC.Item> {
        const rec = await this.table.get(id);
        return rec == null ? null : decode(rec.base64json);
    }

    async put(obj: DC.Item): Promise<void> {
        await this.table.put(this.toRec(obj));
    }

    async update(obj: DC.Item): Promise<void> {
        await this.table.update(this.toRec(obj));
    }

    async remove(id: string): Promise<void> {
        await this.table.remove(id);
    }
}

function encode(obj: DC.Item): string {
    return btoa(JSON.stringify(obj));
}

function decode(base64: string): DC.Item {
    return JSON.parse(atob(base64));
}

type CachedRecord = {
    id: string,
    lastModified: number,
    base64json: string
}

class CachedRecordTable {
    constructor(private storage: Storage, private tableName: string) {
        this.initialized = storage.query(`CREATE TABLE IF NOT EXISTS ${tableName} (id TEXT PRIMARY KEY, lastModified INTEGER, base64json TEXT)`);
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
        const result = await this.query(`SELECT * FROM ${this.tableName} WHERE id = ?`, [name]);
        const rows = result.res.rows;
        logger.debug(() => `Reading response from ${this.tableName}: ${rows.length}`);
        if (rows.length != 1) return null;
        return rows.item(0);
    }

    async put(rec: CachedRecord): Promise<void> {
        await this.query(`INSERT INTO ${this.tableName} (id, lastModified, base64json) VALUES (?, ?, ?)`, [rec.id, rec.lastModified, rec.base64json]);
    }

    async update(rec: CachedRecord): Promise<void> {
        await this.query(`UPDATE ${this.tableName} SET lastModified = ?, base64json = ? WHERE id = ?`, [rec.lastModified, rec.base64json, rec.id]);
    }

    async remove(id: string): Promise<void> {
        await this.query(`DELETE FROM ${this.tableName} WHERE id = ?`, [id]);
    }
}
