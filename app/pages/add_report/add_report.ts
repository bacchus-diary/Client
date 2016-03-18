import {Page} from 'ionic-angular';
import {Observable} from 'rxjs/Rx';

import {RatingComponent} from '../../components/rating/rating';
import {Report} from '../../model/report';
import {Logger} from '../../providers/logging';

const logger = new Logger(AddReportPage);

@Page({
    templateUrl: 'build/pages/add_report/add_report.html',
    directives: [RatingComponent]
})
export class AddReportPage {
    report = new Report("newOne");
}
