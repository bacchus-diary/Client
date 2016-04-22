import {Page, Modal, NavController, NavParams, ViewController} from 'ionic-angular';

import {FATHENS_DIRECTIVES} from '../../components/all';
import {FATHENS_PROVIDERS} from '../../providers/all';
import {FBPublish} from '../../providers/facebook/fb_publish';
import {Report} from '../../model/report';
import {Dialog, Spinner} from '../../util/backdrop';
import {Toast} from '../../util/toast';
import {Logger} from '../../util/logging';

const logger = new Logger('PublishPage');

@Page({
    templateUrl: 'build/pages/publish/publish.html',
    directives: [FATHENS_DIRECTIVES],
    providers: [FATHENS_PROVIDERS]
})
export class PublishPage {
    static async open(nav: NavController, report: Report): Promise<void> {
        return await new Promise<void>((resolve, reject) => {
            const modal = Modal.create(PublishPage, { report: report });
            modal.onDismiss(() => resolve());
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
        logger.debug(() => `Editing message of report: ${this.report}`);
        this.message = this.report.comment || "";
        this.photos = this.report.leaves.map((leaf) => leaf.photo.reduced.mainview.url);
    }

    private report: Report;

    photos: Array<string>;

    message: string;

    cancel() {
        this.close();
    }

    async submit() {
        this.close();
        try {
            await this.fbPublish.publish(this.message, this.report);
            Toast.showLongTop('Share is completed');
        } catch (ex) {
            logger.warn(() => `Failed to share on Facebook: ${JSON.stringify(ex, null, 4)}`);
            await Dialog.alert(this.nav, 'Error on sharing', 'Failed to share on Facebook. Please try again later.');
        }
    }

    private close() {
        this.viewCtrl.dismiss();
    }
}
