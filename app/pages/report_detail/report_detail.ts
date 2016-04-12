import {Page, NavController, NavParams, ActionSheet} from 'ionic-angular';
import {EventEmitter} from 'angular2/core';

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
        private nav: NavController,
        private params: NavParams,
        private fbPublish: FBPublish,
        private cachedReports: CachedReports
    ) {
        const report: Report = params.get('report');
        this.report = report.clone();
        logger.debug(() => `Detail of report: ${this.report}`);
    }

    report: Report;

    private updateLeaves = new EventEmitter<void>(true);

    async onPageWillLeave() {
        await this.update();
    }

    showMore() {
        this.nav.present(ActionSheet.create({
            title: 'MORE ACTIONS',
            buttons: [
                {
                    text: 'Share on Facebook',
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
                        this.remove();
                    }
                }
            ]
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
        if (await Dialog.confirm(this.nav, 'Share on Facebook', 'Are you sure to share on Facebook ?')) {
            try {
                await Spinner.within(this.nav, 'Posting...', async () => {
                    await this.fbPublish.publish(this.report);
                });
            } catch (ex) {
                logger.warn(() => `Failed to share on Facebook: ${ex}`);
                Dialog.alert(this.nav, 'Error on sharing', 'Failed to share on Facebook. Please try again later.');
            }
        }
    }
}
