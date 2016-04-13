import {Page, NavController, NavParams, ViewController} from 'ionic-angular';

import {FATHENS_DIRECTIVES} from '../../components/all';
import {FATHENS_PROVIDERS} from '../../providers/all';
import {Report} from '../../model/report';
import {Logger} from '../../util/logging';

const logger = new Logger(PublishPage);

@Page({
    templateUrl: 'build/pages/publish/publish.html',
    directives: [FATHENS_DIRECTIVES],
    providers: [FATHENS_PROVIDERS]
})
export class PublishPage {
    constructor(params: NavParams, public viewCtrl: ViewController) {
        this.report = params.get('report');
        this.message = this.report.comment || "";
        this.photos = this.report.leaves.map((leaf) => leaf.photo.reduced.mainview.url);
    }

    private report: Report;

    photos: Array<string>;

    message: string;

    dismiss(ok?: boolean) {
        this.viewCtrl.dismiss({
            message: (ok ? this.message : null)
        });
    }
}
