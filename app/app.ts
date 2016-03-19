import {App, IonicApp, Platform} from 'ionic-angular';

import {AcceptancePage} from './pages/acceptance/acceptance';
import {ReportsListPage} from './pages/reports_list/reports_list';

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
            { title: 'Journal', component: ReportsListPage }
        ];

    }

    initializeApp() {
        this.platform.ready().then(() => {
            this.rootPage = AcceptancePage.isAccepted() ? ReportsListPage : AcceptancePage;
        });
    }

    openPage(page) {
        // Reset the content nav to have just this page
        // we wouldn't want the back button to show in this scenario
        let nav = this.app.getComponent('nav');
        nav.setRoot(page.component);
    }
}
