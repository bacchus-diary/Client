import {Page, Modal, NavController, NavParams, ViewController} from 'ionic-angular';

import {FATHENS_DIRECTIVES} from '../../components/all';
import {FATHENS_PROVIDERS} from '../../providers/all';
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
        const message = await new Promise<string>((resolve, reject) => {
            const modal = Modal.create(PublishPage, { report: report });
            modal.onDismiss((res) => {
                resolve(res['message']);
            });
            nav.present(modal);
        });
        if (message) {
            try {
                await Spinner.within(nav, 'Posting...', async () => {
                    // await this.doPublish(message, report);
                    await new Promise((ok, ng) => setTimeout(ok, 3000));
                });
                return true;
            } catch (ex) {
                logger.warn(() => `Failed to share on Facebook: ${ex}`);
                await Dialog.alert(nav, 'Error on sharing', 'Failed to share on Facebook. Please try again later.');
            }
        }
        return false;
    }

    constructor(params: NavParams, public viewCtrl: ViewController) {
        this.report = params.get('report');
        logger.debug(() => `Editing message of report: ${this.report}`);
        this.message = this.report.comment || "";
        this.photos = this.report.leaves.map((leaf) => leaf.photo.reduced.mainview.url);
    }

    private report: Report;

    photos: Array<string>;

    message: string;

    dismiss(ok: boolean) {
        this.viewCtrl.dismiss({
            message: (ok ? this.message : null)
        });
    }
}
