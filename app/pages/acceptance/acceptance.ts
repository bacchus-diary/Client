import {Page, NavController} from 'ionic-angular';
import {Http} from 'angular2/http';
import {Observable} from 'rxjs/Rx';

import {ListPage} from '../list/list';

@Page({
    templateUrl: 'build/pages/acceptance/acceptance.html'
})
export class AcceptancePage {

    private gistId = '23ac8b82bab0b512f8a4';
    private host = 'https://gist.github.com';
    private callbackId = 'gistCallback';

    constructor(private nav: NavController, private http: Http) {
        document.body.querySelector('script');
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
        window.localStorage['acceptance'] = 'true';
        this.nav.setRoot(ListPage);
    }
}
