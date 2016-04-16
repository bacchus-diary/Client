import {Injectable} from 'angular2/core';

import {Report} from '../../model/report';
import {Leaf} from '../../model/leaf';
import {Dynamo, DynamoTable, DBRecord} from '../aws/dynamo';
import {assert} from '../../util/assertion';
import {Pager, PagingList} from '../../util/pager';
import {Logger} from '../../util/logging';

const logger = new Logger(CachedReports);

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
        report = report.clone();
        logger.debug(() => `Adding report: ${report}`);

        const puttings = report.add();
        (await this.currentList).unshift(report);

        await puttings;
    }

    async remove(report: Report) {
        report = report.clone();
        logger.debug(() => `Removing report: ${report}`);

        const removings = report.remove();
        _.remove(await this.currentList, (x) => x.id() == report.id());

        await removings;
    }

    async update(report: Report) {
        report = report.clone();
        logger.debug(() => `Updating report: ${report}`);

        const currentList = await this.currentList;
        logger.debug(() => `Current list: ${currentList}`);
        const originalIndex = _.findIndex(currentList, (x) => x.id() == report.id());
        const original = currentList[originalIndex];
        assert(`Report on current list[${originalIndex}]`, original);
        currentList[originalIndex] = report;

        await original.update(report);
    }
}

export class PagingReports implements PagingList<Report> {
    constructor(private pager: Pager<Report>) { }

    private _list: Array<Report> = [];

    currentList(): Array<Report> {
        return this._list;
    }

    hasMore(): boolean {
        return this.pager.hasMore();
    }

    reset() {
        this.pager.reset();
        this._list = [];
    }

    async more(): Promise<void> {
        const start = this._list.length;
        const goal = start + PAGE_SIZE;
        await this.doMore(start + 1);
        this.doMore(goal); // これ以降はバックグラウンドで追加
    }

    private async doMore(satis: number): Promise<void> {
        while (this.hasMore() && this._list.length < satis) {
            this.add(await this.pager.more(PAGE_SIZE));
        }
    }

    private add(adding: Array<Report>) {
        _.sortBy(adding, 'dateAt').reverse().forEach((x) => {
            try {
                if (_.every(this._list, (o) => o.id() != x.id())) {
                    this._list.push(x);
                }
            } catch (ex) {
                logger.warn(() => `Error on addng ${x} to ${this._list}`);
            }
        });
    }
}
