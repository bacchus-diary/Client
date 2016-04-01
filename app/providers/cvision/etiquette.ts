import {Injectable} from 'angular2/core';

import {LeafContent} from '../../model/leaf';
import * as GCV from './gcv.d';
import {CVision} from './cvision';
import {Logger} from '../../util/logging';

const logger = new Logger(Etiquette);

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
            adult: 'POSSIBLE',
            spoof: 'POSSIBLE',
            violence: 'POSSIBLE',
            medical: 'POSSIBLE'
        };
        const safe = this.src.safeSearchAnnotation;
        return _.every(Object.keys(maximum), (name) => CVision.likelihood[safe[name]] <= CVision.likelihood[maximum[name]]);
    }

    makeContent(): LeafContent {
        const sorted = _.sortBy(this.src.textAnnotations || [], (t) => {
            if (!t.boundingPoly || !t.description) return 0;
            const area = CVision.areaVertices(t.boundingPoly.vertices || []);
            return area / t.description.length;
        });
        const keywords = _.compact(sorted.map((e) => e.description));

        const logo = description(_.head(this.src.logoAnnotations));
        const text = description(_.head(this.src.textAnnotations));
        logger.debug(() => `Texts on photo: ${JSON.stringify({ logo: logo, text: text })}`);
        const desc = _.compact([logo, text]).join("\n\n");

        return {
            title: _.head(keywords),
            keywords: keywords,
            labels: _.compact((this.src.labelAnnotations || []).map((x) => x.description)),
            description: desc,
            description_upper: desc.toUpperCase()
        };
    }
}
