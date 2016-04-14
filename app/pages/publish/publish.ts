import {Page, Modal, NavController, NavParams, ViewController} from 'ionic-angular';

import {FATHENS_DIRECTIVES} from '../../components/all';
import {FATHENS_PROVIDERS} from '../../providers/all';
import {FBPublish} from '../../providers/facebook/fb_publish';
import {Report} from '../../model/report';
import {Dialog, Spinner} from '../../util/backdrop';
import {Logger} from '../../util/logging';

const logger = new Logger(PublishPage);

@Page({
    templateUrl: 'build/pages/publish/publish.html',
    directives: [FATHENS_DIRECTIVES],
    providers: [FATHENS_PROVIDERS]
})
export class PublishPage {
    static async open(nav: NavController, report: Report): Promise<boolean> {
        return await new Promise<boolean>((resolve, reject) => {
            const modal = Modal.create(PublishPage, {
                report: report,
                callback: resolve
            });
            nav.present(modal);
        });
    }

    constructor(
        private nav: NavController,
        params: NavParams,
        private fbPublish: FBPublish,
        public viewCtrl: ViewController
    ) {
        this.report = params.get('report');
        this.callback = params.get('callback');
        logger.debug(() => `Editing message of report: ${this.report}`);
        this.message = this.report.comment || "";
        this.photos = this.report.leaves.map((leaf) => leaf.photo.reduced.mainview.url);
    }

    private report: Report;

    photos: Array<string>;

    message: string;

    private isBacked: boolean = false;
    private callback: (boolean) => void;

    onPageWillLeave() {
        if (!this.isBacked) {
            this.isBacked = true;
            this.callback(false);
        }
    }

    cancel() {
        this.dismiss(false);
    }

    async submit() {
        try {
            await Spinner.within(this.nav, 'Posting...', async () => {
                await this.fbPublish.publish(this.message, this.report);
            });
            this.dismiss(true);
        } catch (ex) {
            logger.warn(() => `Failed to share on Facebook: ${JSON.stringify(ex, null, 4)}`);
            await Dialog.alert(this.nav, 'Error on sharing', 'Failed to share on Facebook. Please try again later.');
            this.dismiss(false);
        }
    }

    private dismiss(ok: boolean) {
        this.isBacked = true;
        this.callback(ok);
        this.viewCtrl.dismiss();
    }
}
