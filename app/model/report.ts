import {Photo} from './photo';

import {Logger} from '../util/logging';

const logger = new Logger(Report);

export class Report {
    leaves: Array<Leaf> = [new Leaf()];
    comment: string = `Good one ${this._id} This is a very nice one !! And you can drink now and everyday. Every night drink drink drink again. We get you happy ! Don't miss it ! `
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

export class Leaf {
    photo: Photo = new Photo();
    description: string = "Bombay Sapphire LONDON DRY GIN INFUSED INFUSE 750ml 40% alc./vol Bottled in London";
}
