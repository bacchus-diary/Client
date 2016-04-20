import {Page, NavController} from 'ionic-angular';
import * as Rx from 'rxjs';

import {FATHENS_DIRECTIVES} from '../../components/all';
import {AddReportPage} from '../add_report/add_report';
import {ReportDetailPage} from '../report_detail/report_detail';
import {Report} from '../../model/report';
import {FATHENS_PROVIDERS} from '../../providers/all';
import {CachedReports} from '../../providers/reports/cached_list';
import {SearchReports} from '../../providers/reports/search';
import {PagingList} from '../../util/pager';
import {Logger} from '../../util/logging';

const logger = new Logger(ReportsListPage);

@Page({
    templateUrl: 'build/pages/reports_list/reports_list.html',
    directives: [FATHENS_DIRECTIVES],
    providers: [FATHENS_PROVIDERS]
})
export class ReportsListPage {
    constructor(
        private nav: NavController,
        private searchReports: SearchReports,
        private cachedReports: CachedReports) { }

    private _pager: PagingList<Report>;
    get pager(): PagingList<Report> {
        return this._pager;
    }
    async setPager(v: Promise<PagingList<Report>>) {
        logger.debug(() => `Start loading.`);
        this.isLoading = true;
        try {
            this._pager = await v;
            if (_.isEmpty(this._pager.currentList())) await this.more();
        } finally {
            logger.debug(() => `Finish loading.`);
            this.isLoading = false;
        }
    }

    isLoading: boolean = true;
    isRefreshing: boolean = false;

    get isEmpty(): boolean {
        return !(
            this.isLoading ||
            this.isRefreshing ||
            this.pager.hasMore()
        ) && _.isEmpty(this.reports);
    }

    get reports(): Array<Report> {
        if (!this.pager) return [];
        return this.pager.currentList();
    }

    imageUrl(index: number): string {
        if (index < 0 || this.reports.length <= index) return null;
        return this.reports[index].leaves[0].photo.reduced.thumbnail.url;
    }

    searchText: string;
    private searchTextInputing: Rx.Subscription;

    isSearchMode: boolean = false;

    inputSearch() {
        if (this.searchTextInputing) this.searchTextInputing.unsubscribe();
        this.searchTextInputing = Rx.Observable.of(null).delay(2000).subscribe(() => {
            this.search();
        });
    }

    async clearSearch() {
        this.isSearchMode = false;
        this.searchText = '';
        this.setPager(this.cachedReports.pagingList);
    }

    search() {
        if (this.searchText.length < 1) {
            this.clearSearch();
        } else {
            this.isSearchMode = true;
            logger.debug(() => `Searching: ${this.searchText}`);
            this.setPager(this.searchReports.byWord(this.searchText));
        }
    }

    async onPageWillEnter() {
        await this.clearSearch();
        logger.debug(() => `Loaded initial reports: ${this.reports.length}`)
    }

    async doRefresh(event) {
        this.isRefreshing = true;
        try {
            this.pager.reset();
            await this.more();
            logger.debug(() => `Refreshed reports: ${this.reports.length}`)
        } finally {
            event.complete();
            this.isRefreshing = false;
        }
    }

    async doInfinite(event) {
        if (this.pager.hasMore()) {
            logger.debug(() => `Getting more reports: ${event}`);
            await this.more();
            logger.debug(() => `Generated reports: ${this.reports.length}`)
        }
        event.complete();
    }

    private async more() {
        try {
            logger.info(() => `Getting reports list...`);
            await this.pager.more();
            logger.debug(() => `CurrentList: ${this.reports.length}`);
        } catch (ex) {
            logger.warn(() => `Failed to get reports list: ${ex}`);
        }
    }

    goReport(report: Report) {
        logger.info(() => `Opening detail: ${report}`);
        this.nav.push(ReportDetailPage, { report: report });
    }

    addNew() {
        this.nav.push(AddReportPage);
    }
}
