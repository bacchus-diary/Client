import {Page, NavController} from 'ionic-angular';
import {EventEmitter} from 'angular2/core';

import {PublishPage} from '../publish/publish';
import {FATHENS_DIRECTIVES} from '../../components/all';
import {FATHENS_PROVIDERS} from '../../providers/all';
import {CachedReports} from '../../providers/reports/cached_list';
import {Report} from '../../model/report';
import {Dialog, Spinner} from '../../util/backdrop';
import {Logger} from '../../util/logging';

const logger = new Logger(AddReportPage);

@Page({
    templateUrl: 'build/pages/add_report/add_report.html',
    directives: [FATHENS_DIRECTIVES],
    providers: [FATHENS_PROVIDERS]
})
export class AddReportPage {
    constructor(private nav: NavController, private cachedReports: CachedReports) { }

    report = Report.newEmpty();

    private updateLeaves = new EventEmitter<void>(true);

    async submit(publish: boolean) {
        logger.debug(() => `Submitting report: publish=${publish}`);
        const ok = await Spinner.within(this.nav, 'Adding...', async () => {
            try {
                await this.cachedReports.add(this.report);
                this.nav.pop();
                return true;
            } catch (ex) {
                logger.warn(() => `Failed to add report: ${ex}`);
                await Dialog.alert(this.nav, 'Error', 'Failed to add your report. Please try again later.', 'OK');
                return false;
            }
        });
        if (ok) {
            if (publish) {
                await PublishPage.open(this.nav, this.report);
            }
        }
    }
}
