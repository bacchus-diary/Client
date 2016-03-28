import {Injectable} from 'angular2/core';

import {Report} from '../../model/report';
import {Dynamo, DynamoTable} from '../aws/dynamo';
import {Pager, PagingList} from '../../util/pager';
import {Logger} from '../../util/logging';

const logger = new Logger(CachedReports);

@Injectable()
export class CachedReports {
    constructor(private dynamo: Dynamo) {
        this.tableReport = Report.createTable(this.dynamo);
    }

    private async load() {
        const table = await this.tableReport;
        const pager = table.queryPager();
        logger.debug(() => `Creating PagingList from: ${pager}`);
        return new PagingList(pager, 20);
    }

    private tableReport: Promise<DynamoTable<Report>>;
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
}
