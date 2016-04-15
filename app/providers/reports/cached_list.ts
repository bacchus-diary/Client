import {Injectable} from 'angular2/core';

import {Report} from '../../model/report';
import {Leaf} from '../../model/leaf';
import {Dynamo, DynamoTable, DBRecord} from '../aws/dynamo';
import {assert} from '../../util/assertion';
import {Pager} from '../../util/pager';
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

export class PagingReports {
    constructor(private pager: Pager<Report>) { }

    private list: Array<Report> = [];

    currentList(): Array<Report> {
        return this.list;
    }

    hasMore(): boolean {
        return this.pager.hasMore();
    }

    async more() {
        const limit = this.list.length + PAGE_SIZE;
        while (this.hasMore() && this.list.length < limit) {
            (await this.pager.more(PAGE_SIZE)).forEach((x) => {
                if (_.every(this.list, (report) => report.id() != x.id())) {
                    this.list.push(x);
                }
            });
        }
    }

    reset() {
        this.list = [];
    }
}
