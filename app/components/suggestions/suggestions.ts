import {Alert, NavController, IONIC_DIRECTIVES} from 'ionic-angular';
import {Component, Input} from 'angular2/core';
import {Observable} from 'rxjs'

import {Report} from '../../model/report';
import {Suggestions, Product, PagingList} from '../../providers/suggestions/suggestions';
import {FATHENS_PROVIDERS} from '../../providers/all';
import {Logger} from '../../util/logging';

const logger = new Logger(SuggestionsComponent);

const scrollLastMergin = 100; // px

@Component({
    selector: 'fathens-suggestions',
    templateUrl: 'build/components/suggestions/suggestions.html',
    directives: [IONIC_DIRECTIVES],
    providers: [FATHENS_PROVIDERS]
})
export class SuggestionsComponent {
    constructor(private suggestions: Suggestions) {    }

    products: PagingList;

    private _report: Report;

    @Input() set reloadEvent(v: Observable<void>) {
        v.subscribe(() => this.refresh());
    }
    @Input() set report(v: Report) {
        this._report = v;
        this.refresh();
    }

    get isLoading(): boolean {
        return this.products.isLoading();
    }

    onScroll(event) {
        if (!this.products.hasMore() || this.isLoading) return;

        const e = event.target as HTMLDivElement;
        const moved = e.scrollLeft;
        const capa = e.scrollWidth - e.offsetWidth;
        if (capa - moved > scrollLastMergin) return;

        logger.debug(() => `Scrolled: ${moved}/${capa}`);
        this.more();
    }

    private async refresh() {
        if (this._report) {
            this.products = await this.suggestions.upon(this._report);
            logger.debug(() => `Setting suggestions of report`);
            this.more();
        } else {
            this.products = null;
        }
    }

    get isReady(): boolean {
        return this.products && this.products.list.length > 0;
    }

    async more() {
        logger.debug(() => "Start getting more suggestions...");
        await this.products.more();
        logger.debug(() => "Finish getting more suggestions...");
    }

    open(product: Product) {
        this.suggestions.open(product);
    }
}
