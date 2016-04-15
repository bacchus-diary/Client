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

    private pager: PagingList<Report>;

    reports: Array<Report>;

    isReady = false;

    searchText: string;
    private searchTextInputing: Rx.Subscription;

    get isSearchMode(): boolean {
        return this.searchText.length > 0;
    }

    search() {
        if (this.searchTextInputing) this.searchTextInputing.unsubscribe();
        this.searchTextInputing = Rx.Observable.of(null).delay(1000).subscribe(async () => {
            if (this.searchText.length < 1) {
                this.clearSearch();
            } else {
                logger.debug(() => `Searching: ${this.searchText}`);
                this.pager = await this.searchReports.byWord(this.searchText);
                await this.more();
            }
        });
    }

    async clearSearch() {
        this.searchText = '';
        this.pager = await this.cachedReports.pagingList;
        await this.more();
    }

    async onPageWillEnter() {
        await this.clearSearch();
        logger.debug(() => `Loaded initial reports: ${this.reports}`)
        this.isReady = true;
    }

    async doRefresh(event) {
        this.pager.reset();
        await this.more();
        logger.debug(() => `Refreshed reports: ${this.reports}`)
        event.complete();
    }

    async doInfinite(event) {
        logger.debug(() => `Getting more reports: ${event}`);
        await this.more();
        logger.debug(() => `Generated reports: ${this.reports}`)
        event.complete();
    }

    private async more() {
        try {
            logger.info(() => `Getting reports list...`);
            await this.pager.more();
            this.reports = await this.pager.currentList();
            logger.debug(() => `CurrentList: ${this.reports}`);
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
