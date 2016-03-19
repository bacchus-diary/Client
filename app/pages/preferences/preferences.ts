import {Page} from 'ionic-angular';
import {Observable} from 'rxjs/Rx';

import {Logger} from '../../providers/logging';

const logger = new Logger(PreferencesPage);

@Page({
    templateUrl: 'build/pages/preferences/preferences.html'
})
export class PreferencesPage {
}
