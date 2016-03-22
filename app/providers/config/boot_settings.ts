import {Injectable} from 'angular2/core';
import {Http} from 'angular2/http';
import {Observable} from 'rxjs/Rx';
import * as yaml from 'js-yaml';

import {Logger} from '../logging';

const logger = new Logger(BootSettings);

@Injectable()
export class BootSettings {
    constructor(private http: Http) {
        this.src = this.http.get('settings.yaml').map((res) => {
            const text = res.text();
            logger.debug(() => `Parsing YAML: ${text}`);
            return yaml.load(text);
        });
    }

    private src: Observable<Map<string, string>>;

    get awsRegion(): Observable<string> {
        return this.src.map((s) => s['awsRegion']);
    }

    get cognitoPoolId(): Observable<string> {
        return this.src.map((s) => s['cognitoPoolId']);
    }

    get s3Bucket(): Observable<string> {
        return this.src.map((s) => s['s3Bucket']);
    }
}
