import {Injectable} from 'angular2/core';

import {Report} from '../../model/report';
import {Leaf} from '../../model/leaf';
import {Photo} from './photo';
import {Cognito} from '../aws/cognito';
import {Dynamo, DynamoTable, DBRecord} from '../aws/dynamo';
import {assert} from '../../util/assertion';
import {Pager, PagingList} from '../../util/pager';
import {Logger} from '../../util/logging';

const logger = new Logger(CachedReports);

const PAGE_SIZE = 10;

@Injectable()
export class CachedReports {
    private static pagingList: Promise<PagingList<Report>>;

    constructor(private cognito: Cognito, private dynamo: Dynamo, private photo: Photo) {
        this.tableReport = Report.createTable(cognito, dynamo, photo);
        this.tableLeaf = Leaf.createTable(cognito, dynamo, photo);
    }

    private async load() {
        const table = await this.tableReport;
        const pager = table.queryPager();
        logger.debug(() => `Creating PagingList from: ${pager}`);
        return new PagingList(pager, PAGE_SIZE);
    }

    private tableReport: Promise<DynamoTable<Report>>;
    private tableLeaf: Promise<DynamoTable<Leaf>>;

    private get pagingList(): Promise<PagingList<Report>> {
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
