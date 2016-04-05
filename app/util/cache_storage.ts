import {Storage, SqlStorage} from 'ionic-angular';

import {Logger} from './logging';

const logger = new Logger(CacheStorage);

export class CacheStorage {
    constructor(private storageName: string, private maxAge: number) { }

    private storage = new Storage(SqlStorage, { name: this.storageName });

    async get<T>(tableName, keys: { [key: string]: string | number; }, getter: () => Promise<T>): Promise<T> {
        const quote = (v: string | number): string => {
            return ('string' == typeof v) ? `'${v}'` : v.toString();
        }
        const query = async (sql: string, values?: any[]): Promise<any> => {
            try {
                logger.debug(() => `Querying to SqlStorage: ${sql} (with: ${values})`);
                const r = await this.storage.query(sql, values);
                logger.debug(() => `Result of SQL: ${JSON.stringify(r)}`);
                return r.res;
            } catch (ex) {
                logger.warn(() => `Failed to SQL: ${JSON.stringify(ex)}`);
                throw ex;
            }
        }
        const getCache = async (): Promise<T> => {
            const constraint = Object.keys(keys).map((name) => `${name} = ?`).join(' AND ');
            const sql = `SELECT * FROM ${tableName} WHERE ${constraint}`;
            const values = Object.keys(keys).map((name) => quote(keys[name]));

            const found = await query(sql, values);
            if (found.length > 0) {
                const record = found[0];
                const timeLimit = new Date().getTime() + this.maxAge;
                if (record.timestamp < timeLimit) {
                    return JSON.parse(record.json);
                }
                await query(`DELETE FROM ${tableName} WHERE ${constraint}`, values);
            }
            return null;
        }
        const createTable = async (): Promise<void> => {
            const sqlType = (v: string | number): string => {
                return {
                    string: 'TEXT',
                    number: 'INTEGER'
                }[typeof v];
            }
            const columns = Object.keys(keys).map((name) => `${name} ${sqlType(keys[name])}`).join(', ');
            await query(`CREATE TABLE IF NOT EXISTS ${tableName} (${columns})`);
        }
        const setCache = async (result: T): Promise<void> => {
            keys['timestamp'] = new Date().getTime();
            keys['json'] = JSON.stringify(result).replace(/'/g, "''");

            await createTable();

            const names = Object.keys(keys).map((name) => name).join(', ');
            const values = Object.keys(keys).map((name) => quote(keys[name])).join(', ');

            await query(`INSERT INTO ${tableName} (${names}) VALUES (${values})`);
        }

        try {
            const cache = await getCache();
            if (cache != null) return cache;
        } catch (ex) {
        }
        const result = await getter();
        try {
            await setCache(result);
        } catch (ex) {
        }
        return result;
    }
}
