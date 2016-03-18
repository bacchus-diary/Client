import {Photo} from './photo';

import {Logger} from '../providers/logging';

const logger = new Logger(Report);

export class Report {
    leaves: Array<Leaf> = [new Leaf()];
    comment: string = `Good one ${this._id} This is a very nice one !! And you can drink now and everyday. We get you !`
    rating: number = 3;
    dateAt: Date = new Date();

    constructor(private _id: string) {
        logger.debug(() => `Creating report: ${_id}`);
    }

    public toString(): string {
        return `Report: ${this._id}`;
    }

    get id(): string {
        return this._id;
    }
}

class Leaf {
    photo: Photo = new Photo();
    description: string = "The bottle";
}
