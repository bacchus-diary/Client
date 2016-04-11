import {Injectable} from 'angular2/core';
import {Http, Headers} from 'angular2/http';

import {Report} from '../../model/report';
import {Leaf} from '../../model/leaf';
import {Cognito} from '../aws/cognito';
import {BootSettings} from '../config/boot_settings';
import {Configuration} from '../config/configuration';
import {FBConnect} from './fb_connect';
import * as BASE64 from '../../util/base64';
import {withFabric} from '../../util/fabric';
import {toPromise} from '../../util/promising';
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

    generateMessage(report: Report): string {
        return report.comment || "";
    }

    async publish(report: Report) {
        logger.info(() => `Publishing: ${report}`);
        const token = await this.con.grantPublish();
        const cred = await this.cognito.identity;
        const server = await this.config.server;
        const fb = (await this.config.authorized).facebook;

        const makeParams = async (): Promise<{ [key: string]: string | boolean }> => {
            const openGraph = async () => {
                const data = {
                    url: `https://api.fathens.org/bacchus-diary/open_graph/report`,
                    region: await this.settings.awsRegion,
                    bucketName: await this.settings.s3Bucket,
                    table_report: `${server.appName}.REPORT`,
                    table_leaf: `${server.appName}.LEAF`,
                    appId: fb.appId,
                    appName: fb.appName,
                    cognitoId: cred.identityId,
                    reportId: report.id(),
                    objectName: fb.objectName,
                    urlTimeout: fb.imageTimeout
                };
                const json = JSON.stringify(data);
                logger.debug(() => `Passing to OpenGraph API: ${json}`);
                return `${data.url}/${encodeURIComponent(btoa(json))}`;
            }
            const params: { [key: string]: string | boolean } = {
                'fb:explicitly_shared': true,
                message: this.generateMessage(report)
            };
            params[fb.objectName] = await openGraph();
            await Promise.all(
                _.range(report.leaves.length).map(async (index) => {
                    const leaf = report.leaves[index];

                    const pre = `image[${index}]`;
                    params[`${pre}[url]`] = await leaf.photo.original.makeUrl();
                    params[`${pre}[user_generated]`] = true;
                })
            );
            return params;
        }

        try {
            const params = await makeParams();
            const url = `${fb.hostname}/me/${fb.appName}:${fb.actionName}`;
            logger.debug(() => `Posting to ${url}: ${JSON.stringify(params)}`);

            const result = await toPromise(this.http.post(
                `${url}?access_token=${token}`,
                JSON.stringify(params),
                {
                    headers: new Headers({
                        'Content-Type': 'application/json'
                    })
                }
            ));
            const obj = result.json();
            logger.debug(() => `Result of Facebook posting: ${JSON.stringify(obj)}`);
            report.publishedFacebook = obj.id;
            withFabric((fabric) => fabric.Answers.eventShare({ method: 'Facebook' }));
        } catch (ex) {
            logger.warn(() => `Error on posting to Facebook: ${JSON.stringify(ex)}`);
            throw ex;
        }
    }
}
