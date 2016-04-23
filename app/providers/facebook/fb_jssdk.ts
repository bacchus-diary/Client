import {Injectable} from 'angular2/core';
import {Http} from 'angular2/http';

import {toPromise} from '../../util/promising';
import {Logger} from '../../util/logging';

import {FBConnectPlugin, PluginCallback} from './plugin';

const logger = new Logger('FBJSSDK');

@Injectable()
export class FBJSSDK implements FBConnectPlugin {
    constructor(private http: Http) { }

    private async initialize(): Promise<void> {
        const scriptId = 'facebook-jssdk';
        if (document.getElementById(scriptId) != null) return;

        const appId = (await toPromise(this.http.get('facebook_app_id'))).text().trim();
        logger.debug(() => `Setting browser facebook app id: ${appId}`);

        const script = document.createElement('script') as HTMLScriptElement;
        script.id = scriptId;
        script.src = 'https://connect.facebook.net/en_US/sdk.js';

        return new Promise<void>((resolve, reject) => {
            (window as any).fbAsyncInit = () => {
                try {
                    (window as any).FB.init({
                        appId: appId,
                        xfbml: false,
                        version: 'v2.5'
                    });
                    resolve();
                } catch (ex) {
                    reject(ex);
                }
            };
            const first = document.getElementsByTagName('script')[0];
            first.parentNode.insertBefore(script, first);
        });
    }

    private invoke<T>(callback: PluginCallback<T>, proc: (fb: FBJSSDKPlugin, callback: FBJSCallback<T>) => void) {
        this.initialize().then(() => {
            proc((window as any).FB, (res) => {
                callback(null, res);
            });
        }).catch((err) => callback(err, null));
    }

    login(callback: PluginCallback<string>, arg?: string): void {
        this.invoke(callback, (fb, callback) => {
            const args = ['public_profile'];
            if (arg) args.push(arg);
            fb.login((res) => {
                callback(res.authResponse.accessToken);
            }, { scope: args.join(',') });
        });
    }

    logout(callback: PluginCallback<void>): void {
        this.invoke(callback, (fb, callback) => {
            fb.logout(callback);
        });
    }

    getName(callback: PluginCallback<string>): void {
        callback('Unsupported oparation: getName', null);
    }

    getToken(callback: PluginCallback<{ token: string, permissions: string[] }>): void {
        this.invoke(callback, (fb, callback) => {
            fb.getLoginStatus((res) => {
                if (res.status == 'connected') {
                    callback({
                        token: res.authResponse.accessToken,
                        permissions: null
                    });
                } else {
                    callback(null);
                }
            });
        });
    }
}

declare type FBJSCallback<T> = (res: T) => void;

interface FBJSSDKPlugin {
    login(callback: FBJSCallback<LoginResponse>, param): void;
    logout(callback: FBJSCallback<void>): void;
    getLoginStatus(callback: FBJSCallback<LoginResponse>): void;
}

interface LoginResponse {
    authResponse: {
        accessToken: string,
        userID: string,
        expiresIn: number,
        signedRequest: string
    };
    status: string;
}
