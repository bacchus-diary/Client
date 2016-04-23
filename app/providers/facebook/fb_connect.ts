import {Injectable} from 'angular2/core';
import {Device} from 'ionic-native';

import {Logger} from '../../util/logging';

import {FBConnectPlugin, PluginCallback} from './plugin';
import {FBJSSDK} from './fb_jssdk';

const logger = new Logger('FBConnect');

@Injectable()
export class FBConnect {
    constructor(private fbjs: FBJSSDK) { }

    get plugin(): FBConnectPlugin {
        logger.debug(() => `Cordova: ${Device.device.cordova}`);
        if (Device.device.cordova) {
            return (window as any).plugin.FBConnect;
        } else {
            return this.fbjs;
        }
    }

    private invoke<T>(proc: (plugin: FBConnectPlugin, callback: PluginCallback<T>) => void): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            proc(this.plugin, (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    try {
                        resolve(result);
                    } catch (ex) {
                        reject(ex);
                    }
                }
            })
        })
    }

    login(): Promise<string> {
        return this.invoke<string>((plugin, callback) => {
            plugin.login(callback);
        });
    }

    logout(): Promise<void> {
        return this.invoke<void>((plugin, callback) => {
            plugin.logout(callback);
        });
    }

    grantPublish(): Promise<string> {
        return this.invoke<string>((plugin, callback) => {
            plugin.login(callback, 'publish_actions');
        });
    }

    getName(): Promise<string> {
        return this.invoke<string>((plugin, callback) => {
            plugin.getName(callback);
        });
    }

    getToken(): Promise<{ token: string, permissions: string[] }> {
        return this.invoke<{ token: string, permissions: string[] }>((plugin, callback) => {
            plugin.getToken(callback);
        });
    }
}
