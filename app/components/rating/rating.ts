import {Component, Input, Output, EventEmitter} from "angular2/core";

import {Logger} from "../../util/logging";

const logger = new Logger("RatingComponent");

@Component({
    selector: "fathens-rating",
    templateUrl: "build/components/rating/rating.html"
})
export class RatingComponent {
    @Input() maxValue: number = 5;
    @Input() value: number;
    @Output() changed = new EventEmitter<number>();

    private _stars: Array<number> = [];
    get stars(): Array<number> {
        if (this._stars.length > this.maxValue) {
            this._stars.splice(this.maxValue);
        }
        for (var i = this._stars.length; i < this.maxValue; i++) {
            this._stars.push(i);
        }
        return this._stars;
    }

    changeValue(v: number) {
        this.changed.emit(v + 1);
    }
}
