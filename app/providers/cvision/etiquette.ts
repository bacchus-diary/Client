import {Injectable} from "angular2/core";

import {Leaf} from "../../model/leaf";
import * as GCV from "./gcv.d";
import {CVision} from "./cvision";
import {Logger} from "../../util/logging";

const logger = new Logger("Etiquette");

@Injectable()
export class EtiquetteVision {
    constructor(private cvision: CVision) { }

    async read(base64image: string): Promise<Etiquette> {
        const res = await this.cvision.request(base64image, {
            LABEL_DETECTION: 10,
            LOGO_DETECTION: 3,
            TEXT_DETECTION: 10,
            SAFE_SEARCH_DETECTION: 1
        });
        if (res.responses.length > 0) {
            return new Etiquette(res.responses[0]);
        } else {
            return null;
        }
    }
}

function description(e: GCV.EntityAnnotation): string {
    return e ? e.description : null;
}

export class Etiquette {
    constructor(private src: GCV.AnnotateImageResponse) { }

    isSafe(maximum?: GCV.SafeSearchAnnotation): boolean {
        maximum = maximum || {
            adult: "POSSIBLE",
            spoof: "POSSIBLE",
            violence: "POSSIBLE",
            medical: "POSSIBLE"
        };
        const safe = this.src.safeSearchAnnotation;
        logger.info(() => `Checking safety: ${JSON.stringify(safe)} with ${JSON.stringify(maximum)}`);
        return _.every(Object.keys(maximum), (name) => CVision.likelihood(safe[name]) <= CVision.likelihood(maximum[name]));
    }

    get logo(): Array<string> {
        return (this.src.logoAnnotations || []).map((x) => x.description);
    }

    get keywords(): Array<string> {
        const list = _.tail(this.src.textAnnotations || []);
        const aread = _.compact(list.map((t) => {
            if (!t.boundingPoly || !t.description) return null;
            const area = CVision.areaVertices(t.boundingPoly.vertices || []);
            return {
                area: area / t.description.length,
                text: t
            };
        }));
        if (aread.length < 1) return [];

        const sorted = _.sortBy(aread.reverse(), (t) => t.area).reverse();

        const max = _.head(sorted).area;
        const min = _.last(sorted).area;
        const limit = min + (max - min) * 0.2;

        const topGroup = _.filter(sorted, (t) => {
            if (t.area < limit) return false;
            if ([/^[^\w]+$/, /^\d{1,4}$/, /^\w{1,2}$/].some((regex) => regex.test(t.text.description))) return false;
            if (t.text.description.replace(/[^\w]/, "").length < 2) return false;
            return true;
        });
        logger.debug(() => `Reduced keywords: ${JSON.stringify(topGroup, null, 4)}\nfrom: ${JSON.stringify(sorted, null, 4)}`);

        return _.flatten([this.logo, _.compact(topGroup.map((e) => e.text.description))]);
    }

    writeContent(leaf: Leaf) {
        leaf.keywords = this.keywords;
        leaf.labels = _.compact((this.src.labelAnnotations || []).map((x) => x.description));
        leaf.description = _.compact([
            this.logo.join("\n"),
            description(_.head(this.src.textAnnotations))
        ]).join("\n\n");
        logger.debug(() => `Leaf by etiquette: ${leaf}`);
    }
}
