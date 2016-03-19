import {Page, NavController} from 'ionic-angular';
import {Observable} from 'rxjs/Rx';

import {RatingComponent} from '../../components/rating/rating';
import {AddReportPage} from '../add_report/add_report';
import {ReportDetailPage} from '../report_detail/report_detail';
import {Report} from '../../model/report';
import {Logger} from '../../providers/logging';

const logger = new Logger(ReportsListPage);

@Page({
    templateUrl: 'build/pages/reports_list/reports_list.html',
    directives: [RatingComponent]
})
export class ReportsListPage {
    constructor(private nav: NavController) { }

    reports: Array<Report>;

    onPageWillEnter() {
        this.doRefresh();
    }

    doRefresh(event?) {
        logger.info(() => `Refreshing reports list...`);
        this.reports = [];
        this.more().subscribe((x) => {
            logger.debug(() => `Refreshed reports: ${x}`)
            if (event) event.complete();
        })
    }

    doInfinite(event) {
        logger.debug(() => `Getting more reports: ${event}`);
        this.more().subscribe((x) => {
            logger.debug(() => `Generated reports: ${x}`)
            event.complete();
        });
    }

    private more(): Observable<any> {
        return Observable.fromPromise(new Promise((resolve, reject) => {
            setTimeout(() => {
                logger.debug(() => `Generating reports`)
                for (var i = 0; i < 10; i++) {
                    this.reports.push(new Report(`id:${this.reports.length}`));
                }
                resolve(this.reports.length);
            }, 3000);
        }));
    }

    goReport(report: Report) {
        logger.info(() => `Opening detail: ${report}`);
        this.nav.push(ReportDetailPage, { report: report });
    }

    addNew() {
        this.nav.push(AddReportPage);
    }
}
