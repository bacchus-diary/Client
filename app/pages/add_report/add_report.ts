import {Page} from 'ionic-angular';

import {RatingComponent} from '../../components/rating/rating';
import {ShowcaseComponent} from '../../components/showcase/showcase';
import {Report} from '../../model/report';
import {Logger} from '../../util/logging';

const logger = new Logger(AddReportPage);

@Page({
    templateUrl: 'build/pages/add_report/add_report.html',
    directives: [RatingComponent, ShowcaseComponent]
})
export class AddReportPage {
    report = Report.newEmpty();

    submit() {
        logger.debug(() => `Submitting report`);
    }
}
