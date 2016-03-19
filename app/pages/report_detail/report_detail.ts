import {Page, NavController, NavParams, ActionSheet} from 'ionic-angular';
import {Observable} from 'rxjs/Rx';

import {RatingComponent} from '../../components/rating/rating';
import {ShowcaseComponent} from '../../components/showcase/showcase';
import {Report} from '../../model/report';
import {Logger} from '../../providers/logging';

const logger = new Logger(ReportDetailPage);

@Page({
    templateUrl: 'build/pages/report_detail/report_detail.html',
    directives: [RatingComponent, ShowcaseComponent]
})
export class ReportDetailPage {
    constructor(private nav: NavController, private params: NavParams) {
        this.report = params.get('report');
        logger.debug(() => `Detail of report: ${this.report}`);
    }

    report: Report;

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
                        this.delete();
                    }
                }
            ]
        }));
    }

    private delete() {
        logger.debug(() => `Deleting report: ${this.report}`);
    }

    private publish() {
        logger.debug(() => `Publishing report: ${this.report}`);
    }
}
