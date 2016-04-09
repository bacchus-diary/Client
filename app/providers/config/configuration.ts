import {Device} from 'ionic-native';
import {Injectable} from 'angular2/core';
import * as yaml from 'js-yaml';

import {BootSettings} from './boot_settings';
import {S3File} from '../aws/s3file';
import {Logger} from '../../util/logging';

const logger = new Logger(Configuration);

@Injectable()
export class Configuration {
    private static unauthorized: Promise<Unauthorized> = null;
    private static authorized: Promise<Authorized> = null;

    constructor(private s3: S3File) { }

    private async loadS3(path: string): Promise<Map<string, any>> {
        return yaml.load(await this.s3.read(path));
    }

    get server(): Promise<Unauthorized> {
        if (Configuration.unauthorized == null) {
            const p = this.loadS3('unauthorized/client.yaml');
            Configuration.unauthorized = p.then((m) => new Unauthorized(m));
        }
        return Configuration.unauthorized;
    }

    get authorized(): Promise<Authorized> {
        if (Configuration.authorized == null) {
            const p = this.loadS3('authorized/settings.yaml');
            Configuration.authorized = p.then((m) => new Authorized(m));
        }
        return Configuration.authorized;
    }
}

class Unauthorized {
    constructor(private src: Map<string, any>) { }

    get appName(): string {
        return this.src['appName'];
    }

    get googleProjectNumber(): string {
        return this.src['googleProjectNumber'];
    }

    get googleBrowserKey(): string {
        return this.src['googleBrowserKey'];
    }

    get snsPlatformArn(): string {
        const s = Device.device.platform == "Android" ? 'google' : 'apple';
        return this.src['snsPlatformArn'][s];
    }

    get photo(): Photo {
        return new Photo(this.src['photo']);
    }

    get advertisement(): Advertisement {
        return new Advertisement(this.src['advertisement']);
    }

    get api(): ServerApiMap {
        return new ServerApiMap(this.src['api']);
    }
}

class Photo {
    constructor(private src: Map<string, any>) { }

    /**
    in Milliseconds
    */
    get urlTimeout(): number {
        return this.src['urlTimeout'] * 1000;
    }
}

class Advertisement {
    constructor(private src: Map<string, any>) { }

    get admob(): Map<string, any> {
        let result = this.src['AdMob'];
        if (!result) result = this.src['AdMod']
        return result;
    }
}

class ServerApiMap {
    constructor(private src: Map<string, any>) { }

    private makeInfo(name: string): ApiInfo {
        return {
            url: `${this.src['base_url']}/${this.src['gateways'][name]}`,
            key: this.src['key'],
            retryLimit: this.src['retry_limit'],
            retryDuration: this.src['retry_duration']
        }
    }

    get paa(): ApiInfo {
        return this.makeInfo('paa');
    }
}

export type ApiInfo = {
    url: string,
    key: string,
    retryLimit: number,
    retryDuration: number // in Milliseconds
}

class Authorized {
    constructor(private src: Map<string, any>) { }

    get facebook(): FBConfig {
        return new FBConfig(this.src['facebook']);
    }
}

class FBConfig {
    constructor(private src: Map<string, string>) { }

    get hostname(): string {
        return this.src['host'];
    }

    get appName(): string {
        return this.src['appName'];
    }

    get appId(): string {
        return this.src['appId'];
    }

    get imageTimeout(): string {
        return this.src['imageTimeout'];
    }

    get actionName(): string {
        return this.src['actionName'];
    }

    get objectName(): string {
        return this.src['objectName'];
    }
}
