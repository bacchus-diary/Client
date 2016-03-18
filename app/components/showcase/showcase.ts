import {IONIC_DIRECTIVES} from 'ionic-angular';
import {Component, Input, Output, EventEmitter} from 'angular2/core';

import {Leaf} from '../../model/report';
import {Logger} from '../../providers/logging';

const logger = new Logger(ShowcaseComponent);

@Component({
    selector: 'fathens-showcase',
    templateUrl: 'build/components/showcase/showcase.html',
    directives: [IONIC_DIRECTIVES]
})
export class ShowcaseComponent {
    @Input() leaves: Array<Leaf>;
}
