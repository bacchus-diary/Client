import {Storage, SqlStorage} from 'ionic-angular';
import {Injectable} from 'angular2/core';

import {BootSettings} from '../config/boot_settings';
import {Logger} from '../../util/logging';

import {ClientConfig} from 'aws-sdk';
import {AWS} from './load_aws';

const logger = new Logger(Cognito);

export const PROVIDER_KEY_FACEBOOK = 'graph.facebook.com';

function setupCredentials(poolId: string): CognitoIdentityCredentials {
    return AWS.config.credentials = new AWS.CognitoIdentityCredentials({
        IdentityPoolId: poolId
    });
}
function getCredentials(): CognitoIdentityCredentials {
    return AWS.config.credentials;
}
interface CognitoIdentityCredentials {
    identityId: string;
    expired: boolean;
    get(callback: (err) => void): void;
    params: {
        IdentityId: string,
        Logins: Map<string, string>
    };
}

@Injectable()
export class Cognito {
    private static initialized: Promise<any> = null;
    private static refreshing: Promise<CognitoIdentity> = null;

    private static changedHooks: Array<ChangedCognitoIdHook> = new Array();
    static addChangingHook(hook: ChangedCognitoIdHook) {
        this.changedHooks.push(hook);
    }

    constructor(private settings: BootSettings) {
        if (Cognito.initialized == null) {
            Cognito.initialized = this.initialize();
        }
    }

    get identity(): Promise<CognitoIdentity> {
        return Cognito.initialized.then((_) => Cognito.refreshing);
    }

    private async initialize(): Promise<void> {
        logger.debug(() => `Initializing Cognito...`);
        (AWS.config as ClientConfig).region = await this.settings.awsRegion;
        const cred = setupCredentials(await this.settings.cognitoPoolId);
        logger.debug(() => `Refreshing credential: ${cred}`);

        if (await ConnectedServices.get(PROVIDER_KEY_FACEBOOK)) {
            // FBConnect.login();
        } else {
            try {
                await this.refresh();
            } catch (ex) {
                getCredentials().params.IdentityId = null;
                await this.refresh();
            }
            // FabricAnswers.eventLogin(method: "Cognito");
        }
    }

    private async refresh(): Promise<CognitoIdentity> {
        const oldId = (Cognito.refreshing == null) ? null : await Cognito.refreshing;

        return Cognito.refreshing = new Promise<CognitoIdentity>((resolve, reject) => {
            logger.info(() => `Refreshing cognito identity... (old = ${oldId})`);
            getCredentials().expired = true;
            getCredentials().get(async (err) => {
                if (err) {
                    logger.warn(() => `Cognito refresh error: ${err}`);
                    reject(err);
                } else {
                    logger.info(() => `Cognito refresh success`);
                    const newId = new CognitoIdentity();
                    logger.debug(() => `Created CognitoIdentity: ${newId}`);
                    if (oldId != null) {
                        await Promise.all(Cognito.changedHooks.map((hook) =>
                            hook(oldId.identityId, newId.identityId)));
                    }
                    resolve(newId);
                }
            });
        });
    }

    async setToken(service: string, token: string): Promise<void> {
        logger.info(() => `SignIn: ${service}`);
        const p = getCredentials().params;
        if (p.Logins.has(service)) {
            logger.info(() => `Nothing to do, since already signed in: ${service}`);
        } else {
            p.Logins[service] = token;
            p.IdentityId = null;
            await this.refresh();
            // FabricAnswers.eventLogin(method: service);
        }
    }

    async removeToken(service: string): Promise<void> {
        logger.info(() => `SignOut: ${service}`);
        const p = getCredentials().params;
        if (p.Logins.has(service)) {
            p.Logins.delete(service);
            p.IdentityId = null;
            await this.refresh();
        } else {
            logger.info(() => `Nothing to do, since not signed in: ${service}`);
        }
    }
}

declare type ChangedCognitoIdHook = (oldId: string, newId: string) => Promise<any>;

function copyList<T>(src: Array<T>): Array<T> {
    const dst = new Array<T>();
    if (src) src.forEach((v) => dst.push(v));
    return dst;
}

function copyMap<V>(src: Map<string, V>): Map<string, V> {
    const dst = new Map<string, V>();
    if (src) src.forEach((value, key) => dst[key] = value);
    return dst;
}

class CognitoIdentity {
    constructor() {
        this.id = getCredentials().identityId;
        this.map = copyMap(getCredentials().params.Logins);
    }

    toString(): string {
        return `Cognito(identityId: ${this.id}, services: [${Array.from(this.map.keys()).join(', ')}])`;
    }

    private id: string;
    private map: Map<string, string>

    get identityId(): string {
        return this.id;
    }

    isJoin(name: string) {
        return this.map.has(name);
    }

    isJoinFacebook() {
        return this.isJoin(PROVIDER_KEY_FACEBOOK);
    }
}

class ConnectedServices {
    private static key = 'logins';
    private static storage = new Storage(SqlStorage);

    static async getMap(): Promise<Map<string, boolean>> {
        const json = await this.storage.getJson(this.key);
        logger.debug(() => `Connected services: ${json}`);
        return (json != null) ? json : new Map();
    }

    static async get(name: string): Promise<boolean> {
        logger.debug(() => `Asking connected service: ${name}`);
        const logins = await this.getMap();
        return logins.has(name) ? logins[name] : false;
    }

    static async set(name: string, v: boolean) {
        const logins = await ConnectedServices.getMap();
        logins[name] = v;
        this.storage.setJson(this.key, logins);
    }
}
