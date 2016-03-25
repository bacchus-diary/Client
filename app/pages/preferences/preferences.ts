import {Page, Storage, SqlStorage} from 'ionic-angular';

import {FATHENS} from '../../providers/all';
import {Cognito} from '../../providers/aws/cognito';
import {Logger} from '../../util/logging';

const logger = new Logger(PreferencesPage);

@Page({
    templateUrl: 'build/pages/preferences/preferences.html',
    providers: [FATHENS]
})
export class PreferencesPage {
    constructor(private cognito: Cognito) { }

    private key = 'preferences';
    private storage = new Storage(SqlStorage);

    private pref = {
        social: {
            facebook: false
        },
        photo: {
            alwaysTake: false
        }
    };

    private async load() {
        const json = await this.storage.getJson(this.key);
        logger.debug(() => `Loaded initial value: ${JSON.stringify(json)}`);
        if (json) this.pref = json;
        this.pref.social.facebook = (await this.cognito.identity).isJoinFacebook();
        logger.debug(() => `Loaded values: ${JSON.stringify(this.pref)}`);
    }

    private async save() {
        logger.debug(() => `Saving values: ${JSON.stringify(this.pref)}`);
        await this.storage.setJson(this.key, this.pref);
    }

    onPageWillEnter() {
        this.load();
    }

    onPageWillLeave() {
        this.save();
    }

    get facebook(): boolean {
        return this.pref.social.facebook;
    }
    set facebook(v: boolean) {
        logger.debug(() => `Setting 'facebook': ${v}`);
        this.pref.social.facebook = v;
        const update = async () => {
            if (v) {
                await this.cognito.joinFacebook();
            } else {
                await this.cognito.dropFacebook();
            }
            const id = await this.cognito.identity;
            this.pref.social.facebook = id.isJoinFacebook();
            logger.debug(() => `Updated 'facebook': ${this.pref.social.facebook}`);
        }
        update();
    }

    get alwaysTake(): boolean {
        return this.pref.photo.alwaysTake;
    }
    set alwaysTake(v: boolean) {
        logger.debug(() => `Setting 'alwaysTake': ${v}`);
        this.pref.photo.alwaysTake = v;
    }
}
