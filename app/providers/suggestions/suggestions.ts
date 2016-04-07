import {Injectable} from 'angular2/core';
import {Device} from 'ionic-native';

import {Report} from '../../model/report';
import {Leaf} from '../../model/leaf';
import {AmazonPAA} from './amazon_paa';
import {PagingList} from '../../util/pager';
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

    async upon(report: Report): Promise<PagingList<Product>> {
        try {
            const keywords = this.makeKeywords(report);
            logger.debug(() => `Searching suggestions by keywords: ${keywords}`);
            const items = await Promise.all(keywords.map((keyword) => this.paa.itemSearch(keyword, 1)));
            return new PagingSuggestions(this.paa, keywords);
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

class PagingSuggestions implements PagingList<Product> {
    constructor(private paa: AmazonPAA, private keywords: Array<string>) { }
    private pageIndex = 0;
    private loading: Promise<void>;

    list: Array<Product> = [];

    hasMore(): boolean {
        return this.pageIndex < 5;
    }

    async more(): Promise<void> {
        if (this.hasMore && !this.loading) {
            this.loading = this.doMore();
            this.loading.then(() => {
                setTimeout(() => this.loading = null, 100);
            });
        }
        return this.loading;
    }

    private async doMore(): Promise<void> {
        this.pageIndex++;
        const loadings = this.keywords.map(async (word) => {
            const products = await this.paa.itemSearch(word, this.pageIndex);
            products.forEach((x) => {
                const index = _.findIndex(this.list, (o) => x.priceValue >= o.priceValue);
                this.list.splice(index, 0, x);
            });
        });
        await Promise.all(loadings);
    }
}
