import {Page} from 'ionic-angular';
import {Observable} from 'rxjs/Rx';

import {Logger} from '../../providers/logging';

const logger = new Logger(PreferencesPage);

@Page({
    templateUrl: 'build/pages/preferences/preferences.html'
})
export class PreferencesPage {
    facebook: boolean;

    alwaysTake: boolean;

    onPageWillEnter() {
        this.facebook = true;
        this.alwaysTake = false;
        logger.debug(() => `Loaded values`);
    }

    onPageWillLeave() {
        logger.debug(() => `Saving values`);
    }
}
