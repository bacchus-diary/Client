import {IONIC_DIRECTIVES} from 'ionic-angular';
import {Component, ElementRef} from 'angular2/core';

import {Logger} from '../../providers/logging';

const logger = new Logger(RatingComponent);

@Component({
    selector: 'fathens-rating',
    templateUrl: 'build/components/rating/rating.html',
    directives: [IONIC_DIRECTIVES]
})
class RatingComponent {
    constructor(ref: ElementRef) {
        this.element = ref.nativeElement;

        this.value = parseInt(this.element.getAttribute('value'));
        const mv = this.element.getAttribute('max-value')
        this.maxValue = mv == null ? 5 : parseInt(mv);


    }

    private element: HTMLElement;
    private value: number;
    private maxValue: number;
    get stars(): Array<number> {
        return [];
    }
}
