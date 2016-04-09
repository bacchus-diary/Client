import {Injectable} from 'angular2/core';

import {Report} from '../../model/report';
import {Leaf} from '../../model/leaf';
import {Photo} from './photo';
import {Cognito} from '../aws/cognito';
import {Dynamo, DynamoTable, DBRecord} from '../aws/dynamo';
import {assert} from '../../util/assertion';
import {Pager} from '../../util/pager';
import {Logger} from '../../util/logging';

const logger = new Logger(CachedReports);

const PAGE_SIZE = 10;

@Injectable()
export class CachedReports {
    private static pagingList: Promise<PagingReports>;

    constructor(private cognito: Cognito, private dynamo: Dynamo, private photo: Photo) { }

    private async load() {
        const table = await Report.table(this.dynamo);
        const pager = table.queryPager();
        logger.debug(() => `Creating PagingList from: ${pager}`);
        return new PagingReports(pager);
    }

    private get pagingList(): Promise<PagingReports> {
        if (!CachedReports.pagingList) {
            CachedReports.pagingList = this.load();
        }
        return CachedReports.pagingList;
    }

    get currentList(): Promise<Array<Report>> {
        return this.pagingList.then((x) => x.list);
    }

    async more() {
        const paging = await this.pagingList;
        if (paging.hasMore()) await paging.more();
    }

    reset() {
        CachedReports.pagingList = null;
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

class PagingReports {
    constructor(private pager: Pager<Report>) { }
    list: Array<Report> = new Array();

    hasMore(): boolean {
        return this.pager.hasMore();
    }

    async more() {
        const adding = await this.pager.more(PAGE_SIZE);
        adding.forEach((x) => this.list.push(x));
    }
}
