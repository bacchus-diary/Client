import {Page, Storage, SqlStorage} from 'ionic-angular';

import {FATHENS_PROVIDERS} from '../../providers/all';
import {Cognito, PROVIDER_KEY_FACEBOOK} from '../../providers/aws/cognito';
import {Preferences} from '../../providers/config/preferences';
import {Logger} from '../../util/logging';

const logger = new Logger('PreferencesPage');

@Page({
    templateUrl: 'build/pages/preferences/preferences.html',
    providers: [FATHENS_PROVIDERS]
})
export class PreferencesPage {
    constructor(private cognito: Cognito, private pref: Preferences) { }

    async onPageWillEnter() {
        this._alwaysTake = await this.pref.getAlwaysTake();
        this._facebook = await this.pref.getSocial(PROVIDER_KEY_FACEBOOK);
    }

    private _facebook: boolean = false;

    get facebook(): boolean {
        return this._facebook;
    }
    set facebook(v: boolean) {
        logger.debug(() => `Setting 'facebook': ${v}`);
        this.pref.setSocial(PROVIDER_KEY_FACEBOOK, this._facebook = v);

        const update = async () => {
            if (v) {
                await this.cognito.joinFacebook();
            } else {
                await this.cognito.dropFacebook();
            }
            const joined = (await this.cognito.identity).isJoinFacebook;
            if (joined != this._facebook) {
                this.pref.setSocial(PROVIDER_KEY_FACEBOOK, this._facebook = joined);
                logger.debug(() => `Updated 'facebook': ${this.facebook}`);
            }
        }
        update();
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
