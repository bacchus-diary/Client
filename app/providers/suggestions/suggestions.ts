import {Injectable} from "angular2/core";

import {Report} from "../../model/report";
import {AmazonPAA} from "./amazon_paa";
import {PagingList} from "../../util/pager";
import {Logger} from "../../util/logging";

const logger = new Logger("Suggestions");

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
                const label = _.head(leaf.labels);
                if (!_.isEmpty(label) && !_.isEmpty(leaf.keywords)) {
                    return _.flatten(_.take(leaf.keywords, 2).map(
                        (keyword) => [`${label} ${keyword}`, keyword]));
                } else if (_.isEmpty(label)) {
                    return _.take(leaf.keywords, 3);
                } else {
                    return _.take(leaf.labels, 3);
                }
            }
        }));
    }

    async upon(report: Report): Promise<PagingList<Product>> {
        const keywords = this.makeKeywords(report);
        return new PagingSuggestions(this.paa, keywords);
    }

    open(product: Product) {
        logger.info(() => `Opening amazon: ${product.url}`);
        const cordova = (window as any).cordova;
        if (cordova && cordova.InAppBrowser) {
            cordova.InAppBrowser.open(product.url, "_system");
        } else {
            window.open(product.url, "_blank");
        }
    }
}

class PagingSuggestions implements PagingList<Product> {
    constructor(private paa: AmazonPAA, private keywords: Array<string>) { }
    private pageIndex = 0;
    private loading: Promise<void>;

    private _list: Array<Product> = [];

    currentList(): Array<Product> {
        return this._list;
    }

    hasMore(): boolean {
        return this.pageIndex < 5;
    }

    isLoading(): boolean {
        return this.loading != null;
    }

    reset() {
        this._list.length = 0;
        this.pageIndex = 0;
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
        const startIndex = this._list.length;
        const loadings = this.keywords.map(async (word) => {
            try {
                logger.debug(() => `Searching suggestions by keywords: ${word}`);
                const products = await this.paa.itemSearch(word, this.pageIndex);
                products.forEach((x) => {
                    if (_.every(this._list, (o) => x.title != o.title)) {
                        const index = _.findIndex(this._list, (o, index) =>
                            startIndex <= index && o.priceValue <= x.priceValue);
                        if (index < 0) {
                            this._list.push(x);
                        } else {
                            this._list.splice(index, 0, x);
                        }
                    }
                });
            } catch (ex) {
                logger.warn(() => `Error on searching items: ${ex}`);
            }
        });
        await Promise.all(loadings);
    }
}
