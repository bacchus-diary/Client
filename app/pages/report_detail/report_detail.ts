import {Page, NavController, NavParams, ActionSheet, Modal} from 'ionic-angular';
import {EventEmitter} from 'angular2/core';

import {PublishPage} from '../publish/publish';
import {FATHENS_DIRECTIVES} from '../../components/all';
import {FATHENS_PROVIDERS} from '../../providers/all';
import {CachedReports} from '../../providers/reports/cached_list';
import {FBPublish} from '../../providers/facebook/fb_publish';
import {Report} from '../../model/report';
import {Dialog, Spinner} from '../../util/backdrop';
import {Logger} from '../../util/logging';

const logger = new Logger(ReportDetailPage);

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
        const report: Report = params.get('report');
        this.report = report.clone();
        logger.debug(() => `Detail of report: ${this.report}`);
        this.updatePublishing();
    }

    report: Report;

    private isPublished: Promise<boolean>;

    private updateLeaves = new EventEmitter<void>(true);

    async onPageWillLeave() {
        logger.debug(() => `Checking empty leaves...`);
        if (_.isEmpty(this.report.leaves)) {
            await this.cachedReports.remove(this.report);
        } else {
            await this.update();
        }
    }

    async showMore() {
        const buttons = [{
            text: 'Delete',
            icon: 'trash',
            cssClass: 'delete',
            handler: () => {
                this.remove();
            }
        }];
        if (!(await this.isPublished)) {
            buttons.splice(0, 0, {
                text: 'Share on Facebook',
                icon: 'share',
                cssClass: 'publish',
                handler: () => {
                    this.publish();
                }
            });
        }
        this.nav.present(ActionSheet.create({
            title: 'MORE ACTIONS',
            buttons: buttons
        }));
    }

    private async update() {
        try {
            await this.cachedReports.update(this.report);
        } catch (ex) {
            logger.warn(() => `Failed to update report: ${ex}`);
        }
    }

    private async remove() {
        if (await Dialog.confirm(this.nav, 'Delete', 'Are you sure to delete this report ?')) {
            try {
                await Spinner.within(this.nav, 'Deleting...', async () => {
                    await this.cachedReports.remove(this.report);
                    this.nav.pop();
                });
            } catch (ex) {
                logger.warn(() => `Failed to delete report: ${ex}`);
                Dialog.alert(this.nav, 'Error on deleting', 'Failed to delete this report.');
            }
        }
    }

    private async publish() {
        const ok = await PublishPage.open(this.nav, this.report);
        if (ok) this.updatePublishing();
    }

    private updatePublishing() {
        this.isPublished = this.fbPublish.getAction(this.report.publishedFacebook).then((x) => x != null);
    }
}
