import {Http, Headers} from 'angular2/http';

import {ApiInfo} from '../config/configuration';
import {toPromise} from '../../util/promising';
import {Logger} from '../../util/logging';

const logger = new Logger(ApiGateway);

export class ApiGateway<T> {
    constructor(
        private http: Http,
        private info: ApiInfo,
        private parseResponse: (res: string) => Promise<T>
    ) { }

    async invoke(params: { [key: string]: any; }): Promise<T> {
        let retryCount = 0;
        while (true) {
            let text;
            try {
                text = await this.doInvoke(params);
            } catch (ex) {
                if (this.info.retryLimit < ++retryCount) throw ex;
                await new Promise((resolve, reject) => {
                    setTimeout(() => resolve(), this.info.retryDuration);
                });
            }
            return this.parseResponse(text);
        }
    }

    private async doInvoke(params: { [key: string]: any; }): Promise<string> {
        const content = JSON.stringify(params);
        logger.debug(() => `ApiGateway: Posting to ${this.info.url}: ${content}`);
        const res = await toPromise(this.http.post(this.info.url, content, {
            headers: new Headers({
                'X-Api-Key': this.info.key,
                'Content-Type': 'application/json'
            })
        }));
        return res.text();
    }
}
