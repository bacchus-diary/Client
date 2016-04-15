import {Page, NavController} from 'ionic-angular';

import {FATHENS_DIRECTIVES} from '../../components/all';
import {AddReportPage} from '../add_report/add_report';
import {ReportDetailPage} from '../report_detail/report_detail';
import {Report} from '../../model/report';
import {FATHENS_PROVIDERS} from '../../providers/all';
import {CachedReports} from '../../providers/reports/cached_list';
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
        private cachedReports: CachedReports) { }

    reports: Array<Report>;

    isReady = false;

    searchText: string = "";

    async search() {
        await new Promise((ok, ng) => setTimeout(ok, 100));
        logger.debug(() => `Searching: ${this.searchText}`);
    }

    async onPageWillEnter() {
        await this.more();
        logger.debug(() => `Loaded initial reports: ${this.reports}`)
        this.isReady = true;
    }

    async doRefresh(event) {
        this.cachedReports.reset();
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
            await this.cachedReports.more();
            this.reports = await this.cachedReports.currentList;
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
