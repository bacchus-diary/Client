import {Page, NavController} from 'ionic-angular';

import {RatingComponent} from '../../components/rating/rating';
import {ShowcaseComponent} from '../../components/showcase/showcase';
import {FATHENS} from '../../providers/all';
import {CachedReports} from '../../providers/reports/cached_list';
import {Report} from '../../model/report';
import {Logger} from '../../util/logging';

const logger = new Logger(AddReportPage);

@Page({
    templateUrl: 'build/pages/add_report/add_report.html',
    directives: [RatingComponent, ShowcaseComponent],
    providers: [FATHENS]
})
export class AddReportPage {
    constructor(private nav: NavController, private cachedReports: CachedReports) { }

    report = Report.newEmpty();

    async submit() {
        logger.debug(() => `Submitting report`);
        await this.cachedReports.add(this.report);
        this.nav.pop();
    }
}
