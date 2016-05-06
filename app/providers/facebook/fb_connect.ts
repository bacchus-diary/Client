import {Injectable} from "angular2/core";
import {Device} from "ionic-native";

import {Logger} from "../../util/logging";

import {FBJSSDK} from "./fb_jssdk";

const logger = new Logger("FBConnect");

@Injectable()
export class FBConnect {
    constructor(private fbjs: FBJSSDK) {
        logger.debug(() => `Cordova: ${Device.device.cordova}`);
        if (Device.device.cordova) {
            this.plugin = (window as any).plugin.FBConnect;
            this.plugin["logger"] = new Logger("FBConnectPlugin");
        } else {
            this.plugin = this.fbjs;
        }
    }

    private plugin: FBConnectPlugin;

    login(): Promise<string> {
        return this.plugin.login();
    }

    logout(): Promise<void> {
        return this.plugin.logout();
    }

    grantPublish(): Promise<string> {
        return this.plugin.login("publish_actions");
    }

    getName(): Promise<string> {
        return this.plugin.getName();
    }

    getToken(): Promise<FBConnectToken> {
        return this.plugin.getToken();
    }
}
