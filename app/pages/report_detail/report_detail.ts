import {Page, NavController, NavParams, ActionSheet} from 'ionic-angular';

import {FATHENS_DIRECTIVES} from '../../components/all';
import {FATHENS_PROVIDERS} from '../../providers/all';
import {CachedReports} from '../../providers/reports/cached_list';
import {Suggestions, Product} from '../../providers/suggestions/suggestions';
import {Report} from '../../model/report';
import {PagingList} from '../../util/pager';
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
        private cachedReports: CachedReports,
        private suggestions: Suggestions
    ) {
        const report: Report = params.get('report');
        this.report = report.clone();
        logger.debug(() => `Detail of report: ${this.report}`);
    }

    report: Report;
    products: PagingList<Product>;

    async onPageWillEnter() {
        await this.updateLeaves();
        this.products.more();
    }

    async onPageWillLeave() {
        await this.update();
    }

    async updateLeaves() {
        this.products = await this.suggestions.upon(this.report);
    }

    async moreSuggestions(event) {
        await this.products.more();
        event.complete();
    }

    openSuggestion(product: Product) {
        this.suggestions.open(product);
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

    private publish() {
        logger.debug(() => `Publishing report: ${this.report}`);
    }
}
