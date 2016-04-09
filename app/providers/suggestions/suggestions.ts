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

    async upon(report: Report): Promise<PagingList> {
        const keywords = this.makeKeywords(report);
        return new PagingSuggestions(this.paa, keywords);
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

export interface PagingList {
    list: Array<Product>;
    hasMore(): boolean;
    more(): Promise<void>;
    isLoading(): boolean;
}

class PagingSuggestions implements PagingList {
    constructor(private paa: AmazonPAA, private keywords: Array<string>) { }
    private pageIndex = 0;
    private loading: Promise<void>;

    isLoading(): boolean {
        return this.loading != null;
    }

    list: Array<Product> = [];

    hasMore(): boolean {
        return this.pageIndex < 5;
    }

    async more(): Promise<void> {
        if (this.hasMore() && !this.isLoading()) {
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
            try {
                logger.debug(() => `Searching suggestions by keywords: ${word}`);
                const products = await this.paa.itemSearch(word, this.pageIndex);
                products.forEach((x) => {
                    const index = _.findIndex(this.list, (o) => x.priceValue >= o.priceValue);
                    this.list.splice(index, 0, x);
                });
            } catch (ex) {
                logger.warn(() => `Error on searching items: ${ex}`);
            }
        });
        await Promise.all(loadings);
    }
}
