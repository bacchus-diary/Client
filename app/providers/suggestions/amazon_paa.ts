import {Injectable} from 'angular2/core';
import {Http} from 'angular2/http';
import {Storage, LocalStorage} from 'ionic-angular';

import {BootSettings} from '../config/boot_settings';
import {Configuration} from '../config/configuration';
import {ApiGateway} from '../aws/api_gateway';
import {Product} from './suggestions';
import * as Base64 from '../../util/base64';
import {Logger} from '../../util/logging';

const logger = new Logger('AmazonPAA');

const ENDPOINT = {
    BR: "https://webservices.amazon.br/onca/xml",
    CA: "https://webservices.amazon.ca/onca/xml",
    CN: "https://webservices.amazon.cn/onca/xml",
    DE: "https://webservices.amazon.de/onca/xml",
    ES: "https://webservices.amazon.es/onca/xml",
    FR: "https://webservices.amazon.fr/onca/xml",
    IN: "https://webservices.amazon.in/onca/xml",
    IT: "https://webservices.amazon.it/onca/xml",
    JP: "https://webservices.amazon.co.jp/onca/xml",
    MX: "https://webservices.amazon.com.mx/onca/xml",
    UK: "https://webservices.amazon.co.uk/onca/xml",
    US: "https://webservices.amazon.com/onca/xml"
};

let _endpoint: Promise<string>;
function getEndpoint(): Promise<string> {
    if (!_endpoint) {
        _endpoint = new Promise<string>((resolve, reject) => {
            (navigator as any).globalization.getLocaleName((code) => {
                const locale: string = code.value;
                logger.debug(() => `Getting locale code: ${locale}`);
                const key = _.find(locale.split('-'), (s) => s.match(/^[A-Z]{2}$/) != null);
                resolve(ENDPOINT[key]);
            }, reject);
        }).catch((err) => {
            logger.warn(() => `Error on getting locale code: ${err}`);
            return ENDPOINT.US;
        });
    }
    return _endpoint;
}

const parser = new DOMParser();
let gateway: Promise<ApiGateway<Document>>;

let invoking: Promise<Document> = null;
const INTERVAL = 5000; // 5 seconds
const CACHE_MAXAGE = 7 * 24 * 60 * 60 * 1000; // 7 days

@Injectable()
export class AmazonPAA {
    constructor(private http: Http, private settings: BootSettings, private config: Configuration) {
        if (!gateway) {
            gateway = config.server.then((c) => new ApiGateway(http, c.api.paa,
                async (plain: string) => {
                    const text = JSON.parse(plain);
                    const xml = parser.parseFromString(text, 'text/xml');
                    const error = xml.getElementsByTagName('parsererror');
                    if (error.length > 0) {
                        throw error.item(0).textContent;
                    }
                    return xml;
                }
            ));
        }
    }

    private storage = new Storage(LocalStorage, { name: `paa_cache_item_search` });

    async invoke(params: { [key: string]: string; }): Promise<Document> {
        let waiting = null;
        while (invoking != waiting) {
            waiting = invoking;
            await waiting;
            await new Promise((resolve, reject) => {
                setTimeout(() => resolve(null), INTERVAL);
            });
        }
        invoking = gateway.then(async (g) => g.invoke({
            params: params,
            endpoint: await getEndpoint(),
            bucketName: await this.settings.s3Bucket
        }));
        const result = await invoking;
        invoking = null;
        return result;
    }

    async doItemSearch(keywords: string, pageIndex: number): Promise<Array<Product>> {
        const xml = await this.invoke({
            Operation: 'ItemSearch',
            SearchIndex: 'All',
            ResponseGroup: 'Images,ItemAttributes,OfferSummary',
            Keywords: keywords.replace(/'/, ''),
            Availability: 'Available',
            ItemPage: `${pageIndex}`
        });

        const elms = xml.querySelectorAll('ItemSearchResponse Items Item');
        logger.debug(() => `PAA Items by '${keywords}': ${elms.length}`);

        return _.range(elms.length).map((index) => this.toProduct(elms.item(index)));
    }

    async itemSearch(keywords: string, pageIndex: number): Promise<Array<Product>> {
        const id = Base64.encodeJson({ keywords: keywords, pageIndex: pageIndex });
        const cache = await this.storage.getJson(id) as CachedRecord;
        if (cache != null) {
            const timeLimit = new Date().getTime() + CACHE_MAXAGE;
            if (cache.lastUpdate < timeLimit) {
                return Base64.decodeJson(cache.base64json);
            }
        }
        const result = await this.doItemSearch(keywords, pageIndex);
        const rec: CachedRecord = {
            lastUpdate: new Date().getTime(),
            base64json: Base64.encodeJson(result)
        }
        await this.storage.setJson(id, rec);
        return result;
    }

    private toProduct(item: Element): Product {
        const text = (query: string) => {
            const e = item.querySelector(query);
            return e ? e.textContent : null;
        }
        const int = (query: string) => parseFloat(text(query) || '0');
        return {
            id: text('ASIN'),
            imageUrl: text('SmallImage URL'),
            imageWidth: int('SmallImage Width'),
            imageHeight: int('SmallImage Height'),
            title: text('ItemAttributes Title'),
            price: text('OfferSummary LowestNewPrice FormattedPrice'),
            priceValue: int('OfferSummary LowestNewPrice Amount'),
            url: text('DetailPageURL')
        };
    }
}

type CachedRecord = {
    lastUpdate: number,
    base64json: string
}
