import {Page, NavController, NavParams} from 'ionic-angular';
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
    }

    report: Report;

    showMore() {

    }
}
