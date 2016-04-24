import {Injectable} from 'angular2/core';
import {Http} from 'angular2/http';

import {toPromise} from '../../util/promising';
import {Logger} from '../../util/logging';

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

    private async invoke<T>(proc: (fb: FBJSSDKPlugin, callback: (result: T) => void) => void) {
        await this.initialize();
        return new Promise<T>((resolve, reject) => {
            proc((window as any).FB, resolve);
        });
    }

    login(arg?: string): Promise<string> {
        return this.invoke<string>((fb, callback) => {
            const args = ['public_profile'];
            if (arg) args.push(arg);
            fb.login((res) => {
                callback(res.authResponse.accessToken);
            }, { scope: args.join(',') });
        });
    }

    logout(): Promise<void> {
        return this.invoke<void>((fb, callback) => {
            fb.logout(callback);
        });
    }

    getName(): Promise<string> {
        throw 'Unsupported oparation: getName';
    }

    getToken(): Promise<FBConnectToken> {
        return this.invoke<FBConnectToken>((fb, callback) => {
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
