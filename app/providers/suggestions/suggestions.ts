import {Injectable} from 'angular2/core';
import {Device} from 'ionic-native';

import {Report} from '../../model/report';
import {Leaf} from '../../model/leaf';
import {AmazonPAA} from './amazon_paa';

import {Logger} from '../../util/logging';

const logger = new Logger(Suggestions);

export type Product = {
    id: string,
    imageUrl: string,
    imageWidth: number,
    imageHeight: number,
    title: string,
    price: string,
    priceValue: number,
    url: string
}

@Injectable()
export class Suggestions {
    constructor(private paa: AmazonPAA) { }

    private makeKeywords(report: Report): Array<string> {
        return _.flatten(report.leaves.map((leaf) => {
            if (leaf.logos.length > 0) {
                return leaf.logos;
            } else {
                return _.take(leaf.keywords, 3);
            }
        }));
    }

    async upon(report: Report): Promise<Array<Product>> {
        try {
            const keywords = this.makeKeywords(report);
            logger.debug(() => `Searching suggestions by keywords: ${keywords}`);
            const items = await Promise.all(keywords.map((keyword) => this.paa.itemSearch(keyword, 1)));
            logger.debug(() => `Searched items: ${JSON.stringify(items, null, 4)}`);
            return _.flatten(items);
        } catch (ex) {
            logger.warn(() => `Error on searching items: ${ex}`);
        }
    }

    open(product: Product) {
        logger.info(() => `Opening amazon: ${product.url}`);
        const cordova = (window as any).cordova;
        if (cordova && cordova.InAppBrowser) {
            cordova.InAppBrowser.open(product.url, '_system');
        } else {
            window.open(product.url, '_blank');
        }
    }
}
