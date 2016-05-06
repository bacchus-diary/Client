import {Page, NavController, MenuController} from "ionic-angular";
import {Http, Response, Jsonp, JSONP_PROVIDERS} from "angular2/http";

import {ReportsListPage} from "../reports_list/reports_list";
import {toPromise} from "../../util/promising";
import {Logger} from "../../util/logging";

const logger = new Logger("AcceptancePage");

@Page({
    templateUrl: "build/pages/acceptance/acceptance.html",
    providers: [JSONP_PROVIDERS]
})
export class AcceptancePage {
    constructor(
        private nav: NavController,
        private menu: MenuController,
        private http: Http,
        private jsonp: Jsonp
    ) { }

    public static isAccepted(): boolean { return window.localStorage["acceptance"]; }
    private static accepted() { window.localStorage["acceptance"] = "true"; }

    private gistId = "23ac8b82bab0b512f8a4";
    private host = "https://gist.github.com";

    isReady = false;

    async onPageWillEnter() {
        this.menu.enable(false);
        const url = `${this.host}/${this.gistId}.json?callback=JSONP_CALLBACK`;
        logger.info(() => "Requesting JSONP: " + url);
        const res = await toPromise(this.jsonp.get(url));
        this.gistCallback(res.json());
        this.isReady = true;
    }

    onPageWillLeave() {
        this.menu.enable(true);
    }

    gistCallback(res) {
        const divString = res["div"];
        if (!_.isNil(divString)) {
            const div = document.createElement("div");
            div.innerHTML = divString;
            this.showGist(div, this.toHref(res["stylesheet"]))
        }
    }

    toHref(hrefString: string): string {
        if (_.isNil(hrefString)) return null;

        if (hrefString.startsWith("<link")) {
            const plain = hrefString.replace(/\\/, "");
            return /href="([^\s]*)"/.exec(plain)[1];
        }
        if (!hrefString.startsWith("http")) {
            const sep = hrefString.startsWith("/") ? "" : "/";
            return this.host + sep + hrefString;
        }
        return hrefString;
    }

    async showGist(div: HTMLDivElement, styleHref: string) {
        const base = document.getElementById("gist");
        logger.info(() => `Append gist to ${base}`);

        const meta = div.querySelector(".gist-meta")
        if (!_.isNil(meta)) meta.remove();

        const css = await this.getStyle(styleHref);
        if (!_.isNil(css)) {
            const style = document.createElement("style");
            style.textContent = css;
            base.appendChild(style);
        }
        base.appendChild(div);
    }

    async getStyle(href): Promise<string> {
        if (_.isNil(href)) {
            return null;
        }
        const res = await toPromise(this.http.get(href));
        return res.text();
    }

    accept() {
        AcceptancePage.accepted();
        this.nav.setRoot(ReportsListPage);
    }
}
