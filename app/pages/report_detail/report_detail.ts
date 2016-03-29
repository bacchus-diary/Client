import {Page, NavController, NavParams, ActionSheet} from 'ionic-angular';

import {RatingComponent} from '../../components/rating/rating';
import {ShowcaseComponent} from '../../components/showcase/showcase';
import {FATHENS} from '../../providers/all';
import {CachedReports} from '../../providers/reports/cached_list';
import {Report} from '../../model/report';
import {Logger} from '../../util/logging';

const logger = new Logger(ReportDetailPage);

@Page({
    templateUrl: 'build/pages/report_detail/report_detail.html',
    directives: [RatingComponent, ShowcaseComponent],
    providers: [FATHENS]
})
export class ReportDetailPage {
    constructor(private nav: NavController, private params: NavParams, private cachedReports: CachedReports) {
        this.report = params.get('report');
        logger.debug(() => `Detail of report: ${this.report}`);
    }

    report: Report;

    async onPageWillLeave() {
        this.update();
    }

    showMore() {
        this.nav.present(ActionSheet.create({
            title: 'MORE ACTIONS',
            buttons: [
                {
                    text: 'Publish to Facebook',
                    icon: 'share',
                    cssClass: 'publish',
                    handler: () => {
                        this.publish();
                    }
                },
                {
                    text: 'Delete',
                    icon: 'trash',
                    cssClass: 'delete',
                    handler: () => {
                        this.remove();
                    }
                }
            ]
        }));
    }

    private async update() {
        await this.cachedReports.update(this.report);
    }

    private async remove() {
        await this.cachedReports.remove(this.report);
    }

    private publish() {
        logger.debug(() => `Publishing report: ${this.report}`);
    }
}
