import {Injectable} from 'angular2/core';
import {Device} from 'ionic-native';

import {Report} from '../../model/report';
import {Leaf} from '../../model/leaf';
import {AmazonPAA} from './amazon_paa';

import {Logger} from '../../util/logging';

const logger = new Logger(Suggestions);

@Injectable()
export class Suggestions {
    constructor(private paa: AmazonPAA) { }

    private makeKeywords(report: Report): Array<string> {
        return _.flatten(report.leaves.map((leaf) => {
            if (leaf.logos.length > 0) {
                return leaf.logos;
            } else {
                const joined = [leaf.keywords.join(' ')];
                return _.flatten([joined, leaf.keywords]);
            }
        }));
    }

    async upon(report: Report): Promise<Array<Product>> {
        const keywords = this.makeKeywords(report);
        logger.debug(() => `Searching suggestions by keywords: ${keywords}`);
        return null;
    }
}

export class Product {
    constructor(
        public id: string,
        public imageUrl: string,
        public imageWidth: number,
        public imageHeight: number,
        public title: string,
        public price: string,
        public priceValue: number,
        public url: string
    ) { }

    open() {
        logger.info(() => `Opening amazon: ${this.url}`);
        const cordova = (window as any).cordova;
        if (cordova && cordova.InAppBrowser) {
            cordova.InAppBrowser.open(this.url, '_system');
        } else {
            window.open(this.url, '_blank');
        }
    }
}
