import {App, IonicApp, Platform, NavController} from 'ionic-angular';
import {Splashscreen} from 'ionic-native';

import {AcceptancePage} from './pages/acceptance/acceptance';
import {ReportsListPage} from './pages/reports_list/reports_list';
import {PreferencesPage} from './pages/preferences/preferences';
import {Logger} from './util/logging';

@App({
    templateUrl: 'build/app.html',
    config: {} // http://ionicframework.com/docs/v2/api/config/Config/
})
class MyApp {
    rootPage: any;
    pages: Array<{ title: string, component: any }>

    constructor(private app: IonicApp, private platform: Platform) {
        this.initializeApp();

        // used for an example of ngFor and navigation
        this.pages = [
            { title: 'Journal', component: ReportsListPage },
            { title: 'Preferences', component: PreferencesPage }
        ];

    }

    initializeApp() {
        this.platform.backButton.subscribe(() => {
            const nav = this.app.getActiveNav() as NavController;
            if (!nav.hasOverlay() && nav.canGoBack()) {
                nav.pop();
            }
        })
        this.platform.ready().then(async () => {
            Splashscreen.show();
            await Logger.setLebelByVersionNumber();
            this.rootPage = AcceptancePage.isAccepted() ? ReportsListPage : AcceptancePage;
            Splashscreen.hide();
        });
    }

    openPage(page) {
        // Reset the content nav to have just this page
        // we wouldn't want the back button to show in this scenario
        let nav = this.app.getComponent('nav');
        nav.setRoot(page.component);
    }
}
