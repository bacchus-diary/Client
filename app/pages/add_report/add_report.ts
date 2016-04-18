import {Page, NavController} from 'ionic-angular';
import {EventEmitter} from 'angular2/core';

import {PublishPage} from '../publish/publish';
import {FATHENS_DIRECTIVES} from '../../components/all';
import {FATHENS_PROVIDERS} from '../../providers/all';
import {CachedReports} from '../../providers/reports/cached_list';
import {Report} from '../../model/report';
import {Dialog, Spinner, Overlay} from '../../util/backdrop';
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

    private isSubmitted = false;

    async onPageWillLeave() {
        if (!this.isSubmitted) {
            this.report.remove();
        }
    }

    async submit() {
        logger.debug(() => `Submitting report`);
        try {
            await Spinner.within(this.nav, 'Adding...', async () => {
                await this.cachedReports.add(this.report);
            });
            const publish = await Dialog.confirm(this.nav,
                'Share ?',
                'You can share this report on Facebook.',
                { ok: 'Yes, Share', cancel: 'No, through' }
            );
            if (publish) {
                await PublishPage.open(this.nav, this.report);
            }
            await Overlay.wait(this.nav);
            logger.debug(() => `Success to add. leaving this page...`);
            this.isSubmitted = true;
            this.nav.pop();
        } catch (ex) {
            logger.warn(() => `Failed to add report: ${ex}`);
            await Dialog.alert(this.nav, 'Error', 'Failed to add your report. Please try again later.', 'OK');
        }
    }
}
