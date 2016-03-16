import {Page, NavController, MenuController} from 'ionic-angular';
import {Http, Jsonp, JSONP_PROVIDERS} from 'angular2/http';
import {Observable} from 'rxjs/Rx';

import {Logger} from '../../providers/logging';
import {ListPage} from '../list/list';

const logger = new Logger(AcceptancePage);

@Page({
    templateUrl: 'build/pages/acceptance/acceptance.html',
    providers: [JSONP_PROVIDERS]
})
export class AcceptancePage {
    public static isAccepted(): boolean { return window.localStorage['acceptance']; }
    private static accepted() { window.localStorage['acceptance'] = 'true'; }

    private gistId = '23ac8b82bab0b512f8a4';
    private host = 'https://gist.github.com';

    constructor(private nav: NavController, private menu: MenuController, private http: Http, jsonp: Jsonp) {
        const url = `${this.host}/${this.gistId}.json?callback=JSONP_CALLBACK`;
        logger.info(() => "Requesting JSONP: " + url);
        jsonp.get(url).subscribe((res) => {
            this.gistCallback(res.json());
        });
    }

    onPageDidEnter() {
        this.menu.enable(false);
    }

    onPageDidLeave() {
        this.menu.enable(true);
    }

    gistCallback(res) {
        const divString = res['div'];
        if (divString != null) {
            const div = document.createElement('div');
            div.innerHTML = divString;
            this.showGist(div, this.toHref(res['stylesheet']))
        }
    }

    toHref(hrefString: string): string {
        if (hrefString == null) return null;

        if (hrefString.startsWith('<link')) {
            const plain = hrefString.replace(/\\/, '');
            return /href="([^\s]*)"/.exec(plain)[1];
        }
        if (!hrefString.startsWith('http')) {
            const sep = hrefString.startsWith('/') ? '' : '/';
            return this.host + sep + hrefString;
        }
        return hrefString;
    }

    showGist(div: HTMLDivElement, styleHref: string) {
        const base = document.getElementById('gist');
        logger.info(() => `Append gist to ${base}`);

        const meta = div.querySelector('.gist-meta')
        if (meta != null) meta.remove();

        this.getStyle(styleHref).subscribe(css => {
            if (css != null) {
                const style = document.createElement('style');
                style.textContent = css;
                base.appendChild(style);
            }
            base.appendChild(div);
        });
    }

    getStyle(href): Observable<string> {
        if (href == null) {
            return new Observable(null);
        }
        return this.http.get(href).map(res => res.text());
    }

    accept() {
        AcceptancePage.accepted();
        this.nav.setRoot(ListPage);
    }
}
