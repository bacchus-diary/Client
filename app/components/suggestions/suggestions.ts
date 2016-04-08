import {Alert, NavController, IONIC_DIRECTIVES} from 'ionic-angular';
import {Component, Input, Output, ElementRef, EventEmitter} from 'angular2/core';
import {Observable} from 'rxjs'

import {Report} from '../../model/report';
import {Suggestions, Product} from '../../providers/suggestions/suggestions';
import {FATHENS_PROVIDERS} from '../../providers/all';
import {PagingList} from '../../util/pager';
import {Logger} from '../../util/logging';

const logger = new Logger(SuggestionsComponent);

@Component({
    selector: 'fathens-suggestions',
    templateUrl: 'build/components/suggestions/suggestions.html',
    directives: [IONIC_DIRECTIVES],
    providers: [FATHENS_PROVIDERS]
})
export class SuggestionsComponent {
    constructor(private suggestions: Suggestions) { }

    @Input() set reloadEvent(v: Observable<void>) {
        v.subscribe(() => this.refresh());
    }
    @Input() set report(v: Report) {
        this._report = v;
        this.refresh();
    }
    private _report: Report;

    products: PagingList<Product>;

    private async refresh() {
        if (this._report) {
            this.products = await this.suggestions.upon(this._report);
            logger.debug(() => `Setting suggestions of report`);
            this.moreSuggestions();
        } else {
            this.products = null;
        }
    }

    get hasSuggestions(): boolean {
        return this.products && this.products.list.length > 0;
    }

    async moreSuggestions() {
        logger.debug(() => "Start getting more suggestions...");
        await this.products.more();
        logger.debug(() => "Finish getting more suggestions...");
    }

    openSuggestion(product: Product) {
        this.suggestions.open(product);
    }
}
