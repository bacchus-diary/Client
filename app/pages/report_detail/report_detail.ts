import {Page, NavController, NavParams, ActionSheet, Loading} from 'ionic-angular';
import {EventEmitter} from 'angular2/core';

import {FATHENS_DIRECTIVES} from '../../components/all';
import {FATHENS_PROVIDERS} from '../../providers/all';
import {CachedReports} from '../../providers/reports/cached_list';
import {FBPublish} from '../../providers/facebook/fb_publish';
import {Report} from '../../model/report';
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
                    text: 'Publish to Facebook',
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
        await this.cachedReports.remove(this.report);
    }

    private async publish() {
        this.withinLoading('POSTING...', async () => {
            // await this.fbPublish.publish(this.report);
            await new Promise((resolve, reject) => {
                setTimeout(() => resolve(), 3000);
            })
        });
    }

    private async withinLoading(msg: string, proc: () => Promise<void>) {
        const loading = Loading.create({
            content: msg,
            dismissOnPageChange: true
        });
        this.nav.present(loading);
        await proc();
        loading.dismiss();
    }
}
