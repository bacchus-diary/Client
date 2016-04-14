import {Storage, SqlStorage} from 'ionic-angular';
import {Injectable} from 'angular2/core';

import {BootSettings} from '../config/boot_settings';
import {FBConnect} from '../facebook/fb_connect';
import {Preferences} from '../config/preferences';
import {withFabric} from '../../util/fabric';
import {Logger} from '../../util/logging';

import {AWS, ClientConfig} from './aws';

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
    private static initialized: Promise<void> = null;
    private static refreshing: Promise<CognitoIdentity> = null;

    private static changedHooks: Array<ChangedCognitoIdHook> = new Array();
    static addChangingHook(hook: ChangedCognitoIdHook) {
        this.changedHooks.push(hook);
    }

    constructor(private settings: BootSettings, private pref: Preferences, private facebook: FBConnect) {
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

        if (await this.pref.getSocial(PROVIDER_KEY_FACEBOOK)) {
            await this.joinFacebook();
        } else {
            try {
                await this.refresh();
            } catch (ex) {
                logger.warn(() => `Retry to initialize cognito by clearing identityId...`);
                getCredentials().params.IdentityId = null;
                await this.refresh();
            }
            withFabric((fabric) => fabric.Answers.eventLogin({ method: 'Cognito' }));
        }
    }

    private async refresh(): Promise<CognitoIdentity> {
        const oldId = (Cognito.refreshing == null) ? null : await Cognito.refreshing.catch((_) => null);

        return Cognito.refreshing = new Promise<CognitoIdentity>((resolve, reject) => {
            logger.info(() => `Refreshing cognito identity... (old = ${oldId})`);
            getCredentials().expired = true;
            getCredentials().get(async (err) => {
                if (err) {
                    logger.warn(() => `Cognito refresh error: ${err}`);
                    reject(err);
                } else {
                    logger.info(() => `Cognito refresh success`);
                    try {
                        const newId = new CognitoIdentity();
                        logger.debug(() => `Created CognitoIdentity: ${newId}`);
                        if (oldId != null) {
                            await Promise.all(Cognito.changedHooks.map((hook) =>
                                hook(oldId.identityId, newId.identityId))).catch((ex) => {
                                    logger.warn(() => `Error on hook: ${ex}`);
                                });
                        }
                        resolve(newId);
                    } catch (ex) {
                        logger.warn(() => `Failed to process changing CognitoIdentity: ${ex}`);
                        reject(ex);
                    }
                }
            });
        });
    }

    async joinFacebook() {
        const token = await this.facebook.login();
        await this.setToken(PROVIDER_KEY_FACEBOOK, token);
    }

    async dropFacebook() {
        await this.removeToken(PROVIDER_KEY_FACEBOOK);
    }

    private async setToken(service: string, token: string): Promise<void> {
        logger.info(() => `SignIn: ${service}`);
        const p = getCredentials().params;
        if (hasKey(p.Logins, service)) {
            logger.info(() => `Nothing to do, since already signed in: ${service}`);
        } else {
            if (p.Logins) {
                p.Logins[service] = token;
            } else {
                const m = new Map<string, string>();
                m[service] = token;
                p.Logins = m;
            }
            p.IdentityId = null;
            const id = await this.refresh();
            await this.pref.setSocial(service, id.isJoin(service));
            this.pref.save();
            if (id.isJoin(service)) {
                withFabric((fabric) => fabric.Answers.eventLogin({ method: service }));
            }
        }
    }

    private async removeToken(service: string): Promise<void> {
        logger.info(() => `SignOut: ${service}`);
        const p = getCredentials().params;
        if (hasKey(p.Logins, service)) {
            delete p.Logins[service];
            p.IdentityId = null;
            const id = await this.refresh();
            await this.pref.setSocial(service, id.isJoin(service));
            this.pref.save();
        } else {
            logger.info(() => `Nothing to do, since not signed in: ${service}`);
        }
    }
}

function hasKey<V>(map: Map<string, V>, key: string): boolean {
    return map && Object.keys(map).indexOf(key) >= 0;
}

declare type ChangedCognitoIdHook = (oldId: string, newId: string) => Promise<void>;

class CognitoIdentity {
    constructor() {
        this.id = getCredentials().identityId;
        const dst = new Map<string, string>();
        const src = getCredentials().params.Logins;
        if (src) {
            for (var key in src) { dst[key] = src[key]; }
        }
        this.map = dst;
    }

    toString(): string {
        return `Cognito(identityId: ${this.id}, services: [${Object.keys(this.map).join(', ')}])`;
    }

    private id: string;
    private map: Map<string, string>

    get identityId(): string {
        return this.id;
    }

    isJoin(name: string): boolean {
        return hasKey(this.map, name);
    }

    isJoinFacebook(): boolean {
        return this.isJoin(PROVIDER_KEY_FACEBOOK);
    }
}
