import {Photo, Images} from "../providers/reports/photo";

import {Leaf} from "./leaf";
import {Cognito} from "../providers/aws/cognito";
import {Dynamo, DBRecord, createRandomKey} from "../providers/aws/dynamo/dynamo";
import {DynamoTable} from "../providers/aws/dynamo/table";
import {assert} from "../util/assertion";
import {Logger} from "../util/logging";

const logger = new Logger("Report");

export type ReportRecord = {
    COGNITO_ID: string,
    REPORT_ID: string,
    DATE_AT: number,
    LAST_MODIFIED?: number,
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

export class Report implements DBRecord<Report> {
    private static _table: Promise<DynamoTable<ReportRecord, Report>>;
    static async table(dynamo: Dynamo): Promise<DynamoTable<ReportRecord, Report>> {
        if (!this._table) {
            const leafTable = await Leaf.table(dynamo);
            this._table = dynamo.createTable<ReportRecord, Report>((cognito: Cognito, photo: Photo) => {
                return {
                    tableName: "REPORT",
                    idColumnName: "REPORT_ID",
                    reader: async (src: ReportRecord) => {
                        logger.debug(() => `Reading Report from DB: ${JSON.stringify(src)}`);
                        if (!src) return null;
                        const rels = await leafTable.query({
                            COGNITO_ID: (await cognito.identity).identityId,
                            REPORT_ID: src.REPORT_ID
                        }, "COGNITO_ID-REPORT_ID-index");
                        if (_.isEmpty(rels)) {
                            logger.debug(() => `This report has no leaves: ${JSON.stringify(src)}`);
                            (await this._table).remove(src.REPORT_ID);
                            return null;
                        }
                        const indexed = src.CONTENT.LEAF_INDEXES.map((leafId) => rels.find((leaf) => leaf.id() === leafId));
                        const leaves = _.union(_.compact(indexed), rels);
                        return new Report(src.REPORT_ID, new Date(src.DATE_AT), leaves, src.CONTENT);
                    },
                    writer: async (obj) => {
                        const m: ReportRecord = {
                            COGNITO_ID: (await cognito.identity).identityId,
                            REPORT_ID: obj.id(),
                            DATE_AT: obj.dateAt.getTime(),
                            CONTENT: obj.toMap()
                        };
                        return m;
                    }
                };
            });
        }
        return this._table;
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
        assert("id", _id);
        assert("dateAt", _dateAt);
        assert("leaves", _leaves);
        assert("content", content);
    }

    get table(): Promise<DynamoTable<ReportRecord, Report>> {
        assert("Report$Table", Report._table);
        return Report._table;
    }

    get dateAt(): Date {
        return this._dateAt;
    }
    set dateAt(v: Date) {
        assert("dateAt", v);
        this._dateAt = v;
    }

    get leaves(): Array<Leaf> {
        return this._leaves;
    }
    set leaves(v: Array<Leaf>) {
        assert("leaves", v);
        this._leaves = v;
    }

    get comment(): string {
        return this.content.comment ? this.content.comment : "";
    }
    set comment(v: string) {
        assert("comment", v);
        this.content.comment = v;
    }

    get rating(): number {
        return this.content.rating ? this.content.rating : 1;
    }
    set rating(v: number) {
        assert("rating", v);
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
        return `REPORT_ID: ${this.id()}, DATE_AT: ${this.dateAt}, ${JSON.stringify(this.toMap(), null, 4)}`;
    }

    id(): string {
        return this._id;
    }

    private toMap(): ReportContent {
        return {
            rating: this.rating,
            comment: this.comment.length > 0 ? this.comment : null,
            comment_upper: this.comment.length > 0 ? this.comment.toUpperCase() : null,
            LEAF_INDEXES: this.leaves.map((x) => x.id()),
            published: {
                facebook: this.publishedFacebook
            }
        };
    }

    async put() {
        const waits = this.leaves.map((leaf) => leaf.put());
        waits.push((await this.table).put(this));
        await Promise.all(waits);
    }

    async remove() {
        const removings = this.leaves.map((leaf) => leaf.remove());
        removings.push((await this.table).remove(this.id()));
        await Promise.all(removings);
    }
}
