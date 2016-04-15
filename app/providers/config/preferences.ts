import {Storage, SqlStorage} from 'ionic-angular';
import {Injectable} from 'angular2/core';

import {Logger} from '../../util/logging';

const logger = new Logger(Preferences);

type PrefObj = {
    social: { [key: string]: boolean },
    photo: {
        alwaysTake: boolean,
        countTake?: number
    }
};

const key = 'preferences';
const storage = new Storage(SqlStorage);

const COUNT_TAKE_THRESHOLD = 5;

async function load(): Promise<PrefObj> {
    let json: PrefObj;
    try {
        json = await storage.getJson(key)
    } catch (ex) {
        logger.warn(() => `Failed to get preferences: ${ex}`);
    }
    if (!json) {
        json = {
            social: {},
            photo: {
                alwaysTake: false
            }
        };
        save(json);
    }
    logger.debug(() => `Loaded preferences: ${JSON.stringify(json)}`);
    return json;
}

async function save(pref: PrefObj): Promise<void> {
    logger.debug(() => `Saving preferences: ${JSON.stringify(pref)}`);
    await storage.setJson(key, pref);
}

@Injectable()
export class Preferences {
    constructor() {
        this.cache = load();
    }

    private cache: Promise<PrefObj>;

    async save(): Promise<void> {
        await save(await this.cache);
    }

    async getSocial(name: string): Promise<boolean> {
        return (await this.cache).social[name];
    }
    async setSocial(name: string, v: boolean): Promise<void> {
        (await this.cache).social[name] = v;
    }

    async getAlwaysTake(): Promise<boolean> {
        return (await this.cache).photo.alwaysTake;
    }
    async setAlwaysTake(v: boolean): Promise<void> {
        (await this.cache).photo.alwaysTake = v;
        if (!v) (await this.cache).photo.countTake = 0;
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
    }
}
