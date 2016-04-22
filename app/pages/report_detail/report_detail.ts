import {Page, NavController, NavParams, ActionSheet, Modal} from 'ionic-angular';
import {EventEmitter} from 'angular2/core';

import {PublishPage} from '../publish/publish';
import {FATHENS_DIRECTIVES} from '../../components/all';
import {FATHENS_PROVIDERS} from '../../providers/all';
import {CachedReports} from '../../providers/reports/cached_list';
import {FBPublish} from '../../providers/facebook/fb_publish';
import {Report} from '../../model/report';
import {Dialog, Spinner, Overlay} from '../../util/backdrop';
import {Logger} from '../../util/logging';

const logger = new Logger('ReportDetailPage');

@Page({
    templateUrl: 'build/pages/report_detail/report_detail.html',
    directives: [FATHENS_DIRECTIVES],
    providers: [FATHENS_PROVIDERS]
})
export class ReportDetailPage {
    constructor(
        params: NavParams,
        private nav: NavController,
        private fbPublish: FBPublish,
        private cachedReports: CachedReports
    ) {
        this.report = params.get('report');
        logger.debug(() => `Detail of report: ${this.report}`);
    }

    report: Report;

    private updateLeaves = new EventEmitter<void>(true);

    private _updatingPublished: Promise<void>;
    private _isPublishable: boolean;
    get isPublishable(): boolean {
        const id = this.report.publishedFacebook;
        if (id == null) {
            if (this._isPublishable == null) this._isPublishable = true;
        } else if (this._updatingPublished == null) {
            logger.debug(() => `Getting published action...`);
            this._updatingPublished = this.fbPublish.getAction(id).then(async (action) => {
                this._isPublishable = action == null;
                if (action == null) {
                    this.report.publishedFacebook = null;
                    await this.report.put();
                }
                setTimeout(() => this._updatingPublished = null, 10 * 1000);
            });
        }
        return this._isPublishable;
    }

    async onPageWillEnter() {
        this._updatingPublished = null;
    }

    async onPageWillLeave() {
        logger.debug(() => `Checking empty leaves...`);
        if (_.isEmpty(this.report.leaves)) {
            await this.cachedReports.remove(this.report);
        } else {
            await this.update();
        }
    }

    private async update() {
        try {
            await this.report.put();
        } catch (ex) {
            logger.warn(() => `Failed to update report: ${ex}`);
        }
    }

    private async remove() {
        if (await Dialog.confirm(this.nav, 'Delete', 'Are you sure to delete this report ?')) {
            try {
                await Spinner.within(this.nav, 'Deleting...', async () => {
                    await this.cachedReports.remove(this.report);
                });
                await Overlay.wait(this.nav);
                this.nav.pop();
            } catch (ex) {
                logger.warn(() => `Failed to delete report: ${ex}`);
                Dialog.alert(this.nav, 'Error on deleting', 'Failed to delete this report.');
            }
        }
    }

    private async publish() {
        await PublishPage.open(this.nav, this.report);
    }
}
