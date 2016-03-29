import {Injectable} from 'angular2/core';

import {Report, Leaf} from '../../model/report';
import {Cognito} from '../aws/cognito';
import {Dynamo, DynamoTable} from '../aws/dynamo';
import {Pager, PagingList} from '../../util/pager';
import {Logger} from '../../util/logging';

const logger = new Logger(CachedReports);

const PAGE_SIZE = 10;

@Injectable()
export class CachedReports {
    constructor(private cognito: Cognito, private dynamo: Dynamo) {
        this.tableReport = Report.createTable(cognito, dynamo);
        this.tableLeaf = Leaf.createTable(cognito, dynamo);
    }

    private async load() {
        const table = await this.tableReport;
        const pager = table.queryPager();
        logger.debug(() => `Creating PagingList from: ${pager}`);
        return new PagingList(pager, PAGE_SIZE);
    }

    private tableReport: Promise<DynamoTable<Report>>;
    private tableLeaf: Promise<DynamoTable<Leaf>>;

    private _pagingList: Promise<PagingList<Report>>;
    private get pagingList(): Promise<PagingList<Report>> {
        if (!this._pagingList) {
            this._pagingList = this.load();
        }
        return this._pagingList;
    }

    async currentList(): Promise<Array<Report>> {
        const paging = await this.pagingList;
        return paging.list;
    }

    async more() {
        const paging = await this.pagingList;
        if (paging.hasMore()) await paging.more();
    }

    reset() {
        this._pagingList = null;
    }

    async add(report: Report) {
        logger.debug(() => `Adding report: ${report}`);
    }

    async update(report: Report) {
        logger.debug(() => `Updating report: ${report}`);
    }

    async remove(report: Report) {
        logger.debug(() => `Removing report: ${report}`);
    }
}
