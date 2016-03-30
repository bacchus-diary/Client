import {Injectable} from 'angular2/core';

import {Report, Leaf} from '../../model/report';
import {Cognito} from '../aws/cognito';
import {Dynamo, DynamoTable, DBRecord} from '../aws/dynamo';
import {assert} from '../../util/assertion';
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

    get currentList(): Promise<Array<Report>> {
        return this.pagingList.then((x) => x.list);
    }

    async more() {
        const paging = await this.pagingList;
        if (paging.hasMore()) await paging.more();
    }

    reset() {
        this._pagingList = null;
    }

    async add(report: Report) {
        report = report.clone();
        logger.debug(() => `Adding report: ${report}`);

        const tableLeaf = await this.tableLeaf;
        const puttings = report.leaves.map((leaf) => tableLeaf.put(leaf));
        puttings.push((await this.tableReport).put(report));

        (await this.currentList).unshift(report);

        await Promise.all(puttings);
    }

    async remove(report: Report) {
        report = report.clone();
        logger.debug(() => `Removing report: ${report}`);

        const tableLeaf = await this.tableLeaf;
        const removings = report.leaves.map((leaf) => tableLeaf.remove(leaf.id()));
        removings.push((await this.tableReport).remove(report.id()));

        _.remove(await this.currentList, equalsTo(report));

        await Promise.all(removings);
    }

    async update(report: Report) {
        report = report.clone();
        logger.debug(() => `Updating report: ${report}`);

        const currentList = await this.currentList;
        const originalIndex = _.findIndex(currentList, equalsTo(report));
        assert('Report on current list', originalIndex);
        const original = currentList[originalIndex];
        currentList[originalIndex] = report;

        const tableLeaf = await this.tableLeaf;

        const diff = this.diff(original.leaves, report.leaves);
        const addings = diff.onlyDst.map((x) => tableLeaf.put(x));
        const removings = diff.onlySrc.map((x) => tableLeaf.remove(x.id()));
        const updatings = diff.common.map(async (p) => {
            if (p.src.isNeedUpdate(p.dst)) await tableLeaf.update(p.dst);
        });
        const waits = _.flatten([addings, removings, updatings]);

        if (original.isNeedUpdate(report)) {
            waits.push((await this.tableReport).update(report));
        }
        await Promise.all(waits);
    }

    private diff<X extends DBRecord<X>>(src: Array<X>, dst: Array<X>) {
        const includedIn = (list: Array<X>) => (x: X) => _.some(list, equalsTo(x));
        const parted = _.partition(dst, includedIn(src));
        return {
            common: parted[0].map((d) => {
                const s = _.find(src, equalsTo(d));
                return {
                    src: s,
                    dst: d
                };
            }),
            onlyDst: parted[1],
            onlySrc: _.filter(src, includedIn(dst))
        };
    }
}

function equalsTo<X extends DBRecord<X>>(x: X) {
    return (y: X) => y.id() == x.id();
}
