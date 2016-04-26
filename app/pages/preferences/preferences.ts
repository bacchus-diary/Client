import {Page, Storage, SqlStorage, NavController} from 'ionic-angular';

import {FATHENS_PROVIDERS} from '../../providers/all';
import {Cognito, PROVIDER_KEY_FACEBOOK} from '../../providers/aws/cognito';
import {Preferences} from '../../providers/config/preferences';
import {Spinner} from '../../util/backdrop';
import {Logger} from '../../util/logging';

const logger = new Logger('PreferencesPage');

@Page({
    templateUrl: 'build/pages/preferences/preferences.html',
    providers: [FATHENS_PROVIDERS]
})
export class PreferencesPage {
    constructor(private nav: NavController, private cognito: Cognito, private pref: Preferences) { }

    async onPageWillEnter() {
        this._alwaysTake = await this.pref.getAlwaysTake();
        this._facebook = await this.pref.getSocial(PROVIDER_KEY_FACEBOOK);
    }

    private _facebook: boolean = false;

    get facebook(): boolean {
        return this._facebook;
    }
    set facebook(v: boolean) {
        logger.debug(() => `Setting '${PROVIDER_KEY_FACEBOOK}': ${v}`);
        this._facebook = v;

        Spinner.within(this.nav, 'Updating...', async () => {
            if (v) {
                await this.cognito.joinFacebook();
            } else {
                await this.cognito.dropFacebook();
            }
            const joined = (await this.cognito.identity).isJoinFacebook;
            if (joined != this._facebook) {
                this._facebook = joined;
                logger.debug(() => `Updated '${PROVIDER_KEY_FACEBOOK}': ${joined}`);
            }
        });
    }

    private _alwaysTake: boolean = false;

    get alwaysTake(): boolean {
        return this._alwaysTake;
    }
    set alwaysTake(v: boolean) {
        logger.debug(() => `Setting 'alwaysTake': ${v}`);
        this._alwaysTake = v;
        this.pref.setAlwaysTake(v);
    }
}
