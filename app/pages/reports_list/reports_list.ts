import {Page, NavController} from 'ionic-angular';

import {RatingComponent} from '../../components/rating/rating';
import {AddReportPage} from '../add_report/add_report';
import {ReportDetailPage} from '../report_detail/report_detail';
import {Report} from '../../model/report';
import {FATHENS} from '../../providers/all';
import {Configuration} from '../../providers/config/configuration';
import {Logger} from '../../util/logging';

const logger = new Logger(ReportsListPage);

@Page({
    templateUrl: 'build/pages/reports_list/reports_list.html',
    directives: [RatingComponent]
})
export class ReportsListPage {
    constructor(private nav: NavController) { }

    reports: Array<Report>;

    isReady = false;

    async onPageWillEnter() {
        this.reports = [];
        const x = await this.more();
        logger.debug(() => `Loaded initial reports: ${x}`)
        this.isReady = true;
    }

    async doRefresh(event) {
        const x = await this.more();
        logger.debug(() => `Refreshed reports: ${x}`)
        event.complete();
    }

    async doInfinite(event) {
        logger.debug(() => `Getting more reports: ${event}`);
        const x = await this.more();
        logger.debug(() => `Generated reports: ${x}`)
        event.complete();
    }

    private more(): Promise<any> {
        logger.info(() => `Getting reports list...`);
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                logger.debug(() => `Generating reports`)
                for (var i = 0; i < 10; i++) {
                    // this.reports.push(new Report(`id:${this.reports.length}`));
                }
                resolve(this.reports.length);
            }, 3000);
        });
    }

    goReport(report: Report) {
        logger.info(() => `Opening detail: ${report}`);
        this.nav.push(ReportDetailPage, { report: report });
    }

    addNew() {
        this.nav.push(AddReportPage);
    }
}
