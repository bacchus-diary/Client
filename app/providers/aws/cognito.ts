import {Injectable} from 'angular2/core';

import {BootSettings} from '../config/boot_settings';
import {Logger} from '../../util/logging';
import {AWS} from './load_aws';

const logger = new Logger(Cognito);

@Injectable()
export class Cognito {
    private static initialized: Promise<any> = null;

    constructor(private settings: BootSettings) {
        if (Cognito.initialized == null) {
            Cognito.initialized = this.initialize();
        }
    }

    private async initialize(): Promise<any> {
        logger.debug(() => `Initializing Cognito...`);
        AWS.config.region = await this.settings.awsRegion;
        AWS.config.credentials = new AWS.CognitoIdentityCredentials({ IdentityPoolId: await this.settings.cognitoPoolId });
        logger.debug(() => `Refreshing credential: ${AWS.config.credentials}`);
    }
}
