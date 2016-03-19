import {Page, Storage, SqlStorage} from 'ionic-angular';
import {Observable} from 'rxjs/Rx';

import {Logger} from '../../providers/logging';

const logger = new Logger(PreferencesPage);

@Page({
    templateUrl: 'build/pages/preferences/preferences.html'
})
export class PreferencesPage {
    private key = 'preferences';
    private storage = new Storage(SqlStorage);

    pref: any;

    onPageWillEnter() {
        this.storage.getJson(this.key).then((json) => {
            logger.debug(() => `Loaded initial value: ${JSON.stringify(json)}`);
            this.pref = (json != null) ? json : {
                social: {
                    facebook: false
                },
                photo: {
                    alwaysTake: false
                }
            };
            logger.debug(() => `Loaded values: ${JSON.stringify(this.pref)}`);
        });
    }

    onPageWillLeave() {
        logger.debug(() => `Saving values: ${JSON.stringify(this.pref)}`);
        this.storage.setJson(this.key, this.pref);
    }
}
