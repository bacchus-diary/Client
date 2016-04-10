import {Injectable} from 'angular2/core';
import {Http, Headers} from 'angular2/http';

import {Report} from '../../model/report';
import {Cognito} from '../aws/cognito';
import {BootSettings} from '../config/boot_settings';
import {Configuration} from '../config/configuration';
import {FBConnect} from './fb_connect';
import {Logger} from '../../util/logging';

const logger = new Logger(FBPublish);

@Injectable()
export class FBPublish {
    constructor(
        private http: Http,
        private settings: BootSettings,
        private config: Configuration,
        private cognito: Cognito,
        private con: FBConnect
    ) { }

    async publish(report: Report) {
        logger.info(() => `Publishing: ${report}`);
        const token = await this.con.grantPublish();
        const cred = await this.cognito.identity;
        const config = (await this.config.authorized).facebook;

        const makeParams = () => {
            const og = async (name: string, info?: {[key: string]: any}) => {
                const data = {
                    url: `https://api.fathens.org/bacchus-diary/open_graph/${name}`,
                    region: await this.settings.awsRegion,
                    table_report: `${(await this.config.server).appName}`,
                    appId: config.appId,
                    cognitoId: cred.identityId,
                    reportId: report.id()
                };
                _.merge(data, info);

                const json = JSON.stringify(data);
            }
        }
    }
}
