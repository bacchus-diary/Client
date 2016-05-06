import {Injectable} from "angular2/core";

import {Report} from "../../model/report";
import {Leaf} from "../../model/leaf";
import {Cognito} from "../aws/cognito";
import {Dynamo, DBRecord} from "../aws/dynamo/dynamo";
import {DynamoTable} from "../aws/dynamo/table";
import {assert} from "../../util/assertion";
import {Pager, PagingList} from "../../util/pager";
import {Logger} from "../../util/logging";

const logger = new Logger("CachedReports");

const PAGE_SIZE = 10;

@Injectable()
export class CachedReports {
    private static pagingList: Promise<PagingReports>;

    constructor(private dynamo: Dynamo) { }

    private async load() {
        const table = await Report.table(this.dynamo);
        const pager = table.queryPager();
        logger.debug(() => `Creating PagingList from: ${pager}`);
        return new PagingReports(pager);
    }

    get pagingList(): Promise<PagingReports> {
        if (!CachedReports.pagingList) {
            CachedReports.pagingList = this.load();
        }
        return CachedReports.pagingList;
    }

    private get currentList(): Promise<Array<Report>> {
        return this.pagingList.then((x) => x.currentList());
    }

    async add(report: Report) {
        logger.debug(() => `Adding report: ${report}`);

        await report.put();
        (await this.currentList).unshift(report);
    }

    async remove(report: Report) {
        logger.debug(() => `Removing report: ${report}`);

        await report.remove();
        _.remove(await this.currentList, (x) => x.id() === report.id());
    }
}

function differ(src: Array<string>, dst: Array<string>) {
    const notIncluded = (list: Array<string>) => (x: string) => _.every(list, (y) => y !== x);
    const parted = _.partition(dst, notIncluded(src));
    return {
        common: parted[1].map((d) => _.find(src, (x) => x === d)),
        onlyDst: parted[0],
        onlySrc: _.filter(src, notIncluded(dst))
    };
}

export class PagingReports implements PagingList<Report> {
    constructor(private pager: Pager<Report>) {
        Cognito.addChangingHook(async (oldId, newId) => {
            pager.reset();
            logger.debug(() => `Done resetting PagingList`);
            this.more(); // ここはバックグラウンドで Hook 終了後に実行
        });
    }

    private _list: Array<Report> = [];
    private loading: boolean;

    currentList(): Array<Report> {
        return this._list;
    }

    hasMore(): boolean {
        return this.pager.hasMore();
    }

    isLoading(): boolean {
        return this.loading;
    }

    reset() {
        this.pager.reset();
        this._list = [];
    }

    async more(): Promise<void> {
        if (this.hasMore() && !this.isLoading()) {
            const start = this._list.length;
            const goal = start + PAGE_SIZE;
            await this.doMore(start + 1);
            this.doMore(goal);// これ以降はバックグラウンドで追加
        }
    }

    private async doMore(satis: number): Promise<void> {
        this.loading = true;
        try {
            while (this.hasMore() && this._list.length < satis) {
                this.add(await this.pager.more(PAGE_SIZE));
            }
        } finally {
            this.loading = false;
        }
    }

    private add(adding: Array<Report>) {
        _.sortBy(adding, "dateAt").reverse().forEach((x) => {
            try {
                if (_.every(this._list, (o) => o.id() !== x.id())) {
                    this._list.push(x);
                }
            } catch (ex) {
                logger.warn(() => `Error on addng ${x} to ${this._list}`);
            }
        });
    }
}
