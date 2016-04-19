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

    async publish(message: string, report: Report): Promise<string> {
        logger.info(() => `Publishing: ${report}`);
        const token = await this.con.grantPublish();
        const cred = await this.cognito.identity;
        const server = await this.config.server;
        const fb = (await this.config.authorized).facebook;

        const makeParams = async () => {
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
            const params: { [key: string]: string } = {
                'fb:explicitly_shared': 'true',
                message: message
            };
            params[fb.objectName] = await openGraph();
            await Promise.all(
                _.range(report.leaves.length).map(async (index) => {
                    const leaf = report.leaves[index];

                    const pre = `image[${index}]`;
                    params[`${pre}[url]`] = await leaf.photo.original.makeUrl();
                    params[`${pre}[user_generated]`] = 'true';
                })
            );
            return params;
        }

        try {
            const params = await makeParams();
            const content = Object.keys(params).map((name) =>
                [name, params[name]].map(encodeURIComponent).join('=')
            ).join('&').replace(/%20/g, '+')
            const url = `${fb.hostname}/me/${fb.appName}:${fb.actionName}`;
            logger.debug(() => `Posting to ${url}: ${content}`);

            const result = await toPromise(this.http.post(
                `${url}?access_token=${token}`, content, {
                    headers: new Headers({
                        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                    })
                }));
            const obj = result.json();
            logger.debug(() => `Result of Facebook posting: ${JSON.stringify(obj)}`);
            withFabric((fabric) => fabric.Answers.eventShare({ method: 'Facebook' }));
            return obj.id;
        } catch (ex) {
            if (ex['_body']) {
                logger.warn(() => `Error on posting to Facebook: ${ex['_body']}`);
            }
            throw ex;
        }
    }

    async getAction(id: string): Promise<FBPublishedAction> {
        const ac = await this.con.getToken();
        logger.debug(() => `Curent AccessToken for Facebook: ${JSON.stringify(ac)}`);
        if (!ac) return null;
        const token = ac['token'];

        const fb = (await this.config.authorized).facebook;
        try {
            const url = `${fb.hostname}/${id}?access_token=${token}`;
            const result = await toPromise(this.http.get(url));
            const obj = result.json();
            logger.debug(() => `Result of getting action info: ${JSON.stringify(obj)}`);
            return obj;
        } catch (ex) {
            logger.warn(() => `Error on querying action info: ${JSON.stringify(ex, null, 4)}`);
            return null;
        }
    }
}

/**
EXAMPLE {
    "end_time":"2016-04-12T02:53:02+0000",
    "message":"ブルーサファイアと勝手に呼んでいます。",
    "start_time":"2016-04-12T02:53:02+0000",
    "type":"bacchus-diary-test:drink",
    "data":{
        "alcohol":{
            "id":"1029792407115621",
            "title":"Report:IU67E5SP2645GFDE6EDNUCXN1T5PZZVM",
            "type":"bacchus-diary-test:alcohol",
            "url":"https://api.fathens.org/bacchus-diary/open_graph/report/eyJvYmplY3ROYW1lIjo…QuTEVBRiIsICJyZXBvcnRJZCI6ICJJVTY3RTVTUDI2NDVHRkRFNkVETlVDWE4xVDVQWlpWTSJ9"
        }
    },
    "id":"10209477822647324"
}
*/
export type FBPublishedAction = {
    "id": string,
    "type": string,
    "message": string,
    "start_time": string,
    "end_time": string,
    "data": {
        "alcohol": {
            "id": string,
            "title": string,
            "type": string,
            "url": string,
        }
    }
}
