import {Page, NavController} from 'ionic-angular';
import {EventEmitter} from 'angular2/core';

import {PublishPage} from '../publish/publish';
import {FATHENS_DIRECTIVES} from '../../components/all';
import {FATHENS_PROVIDERS} from '../../providers/all';
import {CachedReports} from '../../providers/reports/cached_list';
import {Report} from '../../model/report';
import {Dialog, Spinner, Overlay} from '../../util/backdrop';
import {Logger} from '../../util/logging';

const logger = new Logger('AddReportPage');

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

    private _submittable: boolean = null;
    private _submittableChecking: Promise<void> = null;
    get isSubmittable(): boolean {
        if (_.isEmpty(this.report.leaves)) return false;
        if (!this._submittable && this._submittableChecking == null) {
            this._submittableChecking = Promise.all(this.report.leaves.map((leaf) => leaf.photo.exists())).then((bools) => {
                this._submittable = bools.every(_.identity);
                setTimeout(() => this._submittableChecking = null, 1000);
            });
        }
        return this._submittable;
    }

    leavesUpdated() {
        this._submittable = null;
        this.updateLeaves.emit(null);
    }

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
            this.isSubmitted = true;

            const publish = await Dialog.confirm(this.nav,
                "Share this ?",
                'You can share this report on Facebook.',
                { ok: 'Yes, Share', cancel: 'No, Thru' }
            );
            if (publish) {
                await PublishPage.open(this.nav, this.report);
            }
            logger.debug(() => `Success to add. leaving this page...`);
            await Overlay.wait(this.nav);
            this.nav.pop();
        } catch (ex) {
            logger.warn(() => `Failed to add report: ${ex}`);
            await Dialog.alert(this.nav, 'Error', 'Failed to add your report. Please try again later.');
        }
    }
}
