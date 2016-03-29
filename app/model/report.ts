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
    comment_upper: string,
    published?: {
        facebook?: string
    }
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
        private _dateAt: Date,
        private _leaves: Array<Leaf>,
        private content: ReportContent
    ) {
        assert('id', _id);
        assert('dateAt', _dateAt);
        assert('leaves', _leaves);
        assert('content', content);
    }

    get dateAt(): Date {
        return this._dateAt;
    }
    set dateAt(v: Date) {
        assert('dateAt', v);
        this._dateAt = v;
    }

    get leaves(): Array<Leaf> {
        return this._leaves;
    }
    set leaves(v: Array<Leaf>) {
        assert('leaves', v);
        this._leaves = v;
    }

    get comment(): string {
        return this.content.comment ? this.content.comment : "";
    }
    set comment(v: string) {
        assert('comment', v);
        this.content.comment = v;
    }

    get rating(): number {
        return this.content.rating ? this.content.rating : 1;
    }
    set rating(v: number) {
        assert('rating', v);
        this.content.rating = v;
    }

    get publishedFacebook(): string {
        return this.content.published ? this.content.published.facebook : null;
    }
    set publishedFacebook(v: string) {
        this.content.published = {
            facebook: v
        };
    }

    public toString(): string {
        return `REPORT_ID: ${this.id()}, DATE_AT: ${this.dateAt}, ${JSON.stringify(this.toMap())}`;
    }

    id(): string {
        return this._id;
    }

    toMap(): ReportContent {
        return {
            rating: this.rating,
            comment: this.comment,
            comment_upper: this.comment.toUpperCase(),
            LEAF_INDEXES: this.leaves.map((x) => x.id()),
            published: {
                facebook: this.publishedFacebook
            }
        };
    }

    isNeedUpdate(other: Report): boolean {
        return this.toString() != other.toString();
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
        assert('reportId', reportId);
        assert('id', _id);
        assert('content', content);
        this._photo = new Photo(reportId, _id);
    }

    private _photo: Photo;
    get photo(): Photo {
        return this._photo;
    }

    get labels(): Array<string> {
        return this.content.labels ? this.content.labels : [];
    }
    set labels(v: Array<string>) {
        assert('labels', v);
        this.content.labels = v;
    }

    get description(): string {
        return this.content.description ? this.content.description : "";
    }
    set description(v: string) {
        assert('description', v);
        this.content.description = v;
    }

    toString(): string {
        return `REPORT_ID=${this.reportId}, LEAF_ID=${this.id()}, ${JSON.stringify(this.toMap())}`;
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
        return this.toString() != other.toString();
    }

    clone(): Leaf {
        return new Leaf(this.reportId, this._id, this.toMap());
    }
}
