import {Injectable} from "angular2/core";
import {Http} from "angular2/http";

import * as GCV from "./gcv.d";
import {Configuration} from "../config/configuration";
import {toPromise} from "../../util/promising";
import {Logger} from "../../util/logging";

const logger = new Logger("CVision");

const urlGCV = "https://vision.googleapis.com/v1/images:annotate";

type FeaturesMap = {
    FACE_DETECTION?: number,
    LANDMARK_DETECTION?: number,
    LOGO_DETECTION?: number,
    LABEL_DETECTION?: number,
    TEXT_DETECTION?: number,
    SAFE_SEARCH_DETECTION?: number,
    IMAGE_PROPERTIES?: number
}

@Injectable()
export class CVision {
    static likelihood(str: GCV.Likelihood): number {
        return {
            UNKNOWN: 0,
            VERY_UNLIKELY: 1,
            UNLIKELY: 2,
            POSSIBLE: 3,
            LIKELY: 4,
            VERY_LIKELY: 5
        }[str];
    }

    static areaVertices(vertices: GCV.Vertix[]): number {
        const sum = _.reduce(_.range(vertices.length), (sum, index) => {
            const pre = vertices[(index > 0 ? index : vertices.length) - 1];
            const cur = vertices[index];
            return sum + (pre.x - cur.x) * (pre.y + cur.y);
        }, 0);
        return Math.abs(sum) / 2;
    }

    constructor(private http: Http, private config: Configuration) { }

    async request(base64image: string, features: FeaturesMap): Promise<GCV.Response> {
        logger.debug(() => `CVision request: ${JSON.stringify(features)}`);

        const url = `${urlGCV}?key=${(await this.config.server).googleBrowserKey}`;
        const request: GCV.Request = {
            requests: [{
                image: { content: base64image },
                features: Object.keys(features).map((name) => {
                    return {
                        type: name as GCV.FeatureType,
                        maxResults: features[name] as number
                    };
                })
            }]
        };
        const res = await toPromise(this.http.post(url, JSON.stringify(request)));

        logger.debug(() => `CVision response: ${res.status}`);
        return res.json();
    }
}
