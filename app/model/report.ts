import {Photo} from './photo';
import * as _ from 'lodash';

import {Dynamo, DynamoTable, DBRecord, createRandomKey} from '../providers/aws/dynamo';
import * as DC from '../providers/aws/document_client.d';
import {Logger} from '../util/logging';

const logger = new Logger(Report);

type ReportRecord = {
    COGNITO_ID: string,
    REPORT_ID: string,
    DATE_AT: number,
    CONTENT: ReportContent
};

type ReportContent = {
    LEAF_INDEXES: string[],
    rating: number,
    comment: string,
    comment_upper: string
};

type LeafRecord = {
    COGNITO_ID: string,
    REPORT_ID: string,
    LEAF_ID: string,
    CONTENT: LeafContent
};
type LeafContent = {
    labels: string[],
    description: string,
    description_upper: string
};

export class Report implements DBRecord<Report> {
    private static table: Promise<DynamoTable<Report>>;
    static async createTable(dynamo: Dynamo): Promise<DynamoTable<Report>> {
        if (!this.table) {
            this.table = dynamo.createTable<Report>('REPORT', 'REPORT_ID', async (src: ReportRecord) => {
                logger.debug(() => `Reading Report from DB: ${JSON.stringify(src)}`);
                if (!src) return null;
                const leafTable = await Leaf.createTable(dynamo);
                const waits = src.CONTENT.LEAF_INDEXES.map((leafId) => {
                    return leafTable.get(leafId);
                });
                const leaves = _.filter(await Promise.all(waits));
                if (_.isEmpty(leaves)) return null;
                return new Report(src.REPORT_ID, new Date(src.DATE_AT), leaves, src.CONTENT);
            }, async (obj) => {
                const m: ReportRecord = {
                    COGNITO_ID: (await dynamo.cognito.identity).identityId,
                    REPORT_ID: obj.id(),
                    DATE_AT: obj.dateAt.getTime(),
                    CONTENT: obj.toMap()
                };
                return m;
            });
        }
        return this.table;
    }

    static newEmpty(): Report {
        return new Report(createRandomKey(), new Date(), [], {
            rating: null,
            comment: null,
            comment_upper: null,
            LEAF_INDEXES: null
        });
    }

    constructor(
        private _id: string,
        public dateAt: Date,
        public leaves: Array<Leaf>,
        private content: ReportContent
    ) { }

    get comment(): string {
        return this.content.comment;
    }
    set comment(v: string) {
        this.content.comment = v;
    }

    get rating(): number {
        return this.content.rating;
    }
    set rating(v: number) {
        this.content.rating = v;
    }

    public toString(): string {
        return `Report: ${JSON.stringify(this.content)}`;
    }

    private get contentString(): string {
        return JSON.stringify(this.toMap());
    }

    id(): string {
        return this._id;
    }

    toMap(): ReportContent {
        return {
            rating: this.rating,
            comment: this.comment,
            comment_upper: this.comment.toUpperCase(),
            LEAF_INDEXES: this.leaves.map((x) => x.id())
        };
    }

    isNeedUpdate(other: Report): boolean {
        return this.contentString != other.contentString || this.dateAt != other.dateAt;
    }

    clone(): Report {
        return new Report(this._id,
            new Date(this.dateAt.getTime()),
            this.leaves.map((x) => x.clone()),
            this.toMap());
    }
}

export class Leaf implements DBRecord<Leaf> {
    private static table: Promise<DynamoTable<Leaf>>;
    static async createTable(dynamo: Dynamo): Promise<DynamoTable<Leaf>> {
        if (!this.table) {
            this.table = dynamo.createTable<Leaf>('LEAF', 'LEAF_ID', async (src: LeafRecord) => {
                logger.debug(() => `Reading Leaf from DB: ${JSON.stringify(src)}`);
                if (!src) return null;
                return new Leaf(src.REPORT_ID, src.LEAF_ID, src.CONTENT);
            }, async (obj) => {
                return {
                    COGNITO_ID: (await dynamo.cognito.identity).identityId,
                    LEAF_ID: obj.id(),
                    CONTENT: obj.toMap()
                };
            });
        }
        return this.table;
    }

    static newEmpty(reportId: string): Leaf {
        return new Leaf(reportId, createRandomKey(), {
            labels: [],
            description: null,
            description_upper: null
        });
    }

    constructor(
        private reportId: string,
        private _id: string,
        private content: LeafContent
    ) {
        this._photo = new Photo(reportId, _id);
    }

    private _photo: Photo;
    get photo(): Photo {
        return this._photo;
    }

    get labels(): Array<string> {
        return this.content.labels;
    }
    set labels(v: Array<string>) {
        this.content.labels = v;
    }

    get description(): string {
        return this.content.description;
    }
    set description(v: string) {
        this.content.description = v;
    }

    private get contentString(): string {
        return JSON.stringify(this.toMap());
    }

    id(): string {
        return this._id;
    }

    toMap(): LeafContent {
        return {
            labels: this.labels.map(_.identity),
            description: this.description,
            description_upper: this.description.toUpperCase()
        };
    }

    isNeedUpdate(other: Leaf): boolean {
        return this.contentString != other.contentString;
    }

    clone(): Leaf {
        return new Leaf(this.reportId, this._id, this.toMap());
    }
}
