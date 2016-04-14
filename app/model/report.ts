import {Photo, Images} from '../providers/reports/photo';

import {Leaf} from './leaf';
import {Cognito} from '../providers/aws/cognito';
import {Dynamo, DynamoTable, DBRecord, createRandomKey} from '../providers/aws/dynamo';
import * as DC from '../providers/aws/document_client.d';
import {assert} from '../util/assertion';
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

export class Report implements DBRecord<Report> {
    private static _table: Promise<DynamoTable<Report>>;
    static async table(dynamo: Dynamo): Promise<DynamoTable<Report>> {
        if (!this._table) {
            this._table = dynamo.createTable<Report>({
                tableName: 'REPORT',
                idColumnName: 'REPORT_ID',
                reader: (cognito: Cognito, photo: Photo) => async (src: ReportRecord) => {
                    logger.debug(() => `Reading Report from DB: ${JSON.stringify(src)}`);
                    if (!src) return null;
                    const leafTable = await Leaf.table(dynamo);
                    const rels = await leafTable.query({
                        COGNITO_ID: (await cognito.identity).identityId,
                        REPORT_ID: src.REPORT_ID
                    }, 'COGNITO_ID-REPORT_ID-index');
                    if (_.isEmpty(rels)) {
                        logger.debug(() => `This report has no leaves: ${JSON.stringify(src)}`);
                        (await this._table).remove(src.REPORT_ID);
                        return null;
                    }
                    const indexed = src.CONTENT.LEAF_INDEXES.map((leafId) => rels.find((leaf) => leaf.id() == leafId));
                    const leaves = _.union(_.compact(indexed), rels);
                    return new Report(src.REPORT_ID, new Date(src.DATE_AT), leaves, src.CONTENT);
                },
                writer: (cognito: Cognito, photo: Photo) => async (obj) => {
                    const m: ReportRecord = {
                        COGNITO_ID: (await cognito.identity).identityId,
                        REPORT_ID: obj.id(),
                        DATE_AT: obj.dateAt.getTime(),
                        CONTENT: obj.toMap()
                    };
                    return m;
                }
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
        assert('id', _id);
        assert('dateAt', _dateAt);
        assert('leaves', _leaves);
        assert('content', content);
    }

    get table(): Promise<DynamoTable<Report>> {
        assert('Report$Table', Report._table);
        return Report._table;
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
        return `REPORT_ID: ${this.id()}, DATE_AT: ${this.dateAt}, ${JSON.stringify(this.toMap(), null, 4)}`;
    }

    id(): string {
        return this._id;
    }

    toMap(): ReportContent {
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

    isNeedUpdate(other: Report): boolean {
        return this.toString() != other.toString();
    }

    clone(): Report {
        return new Report(this._id,
            new Date(this.dateAt.getTime()),
            this.leaves.map((x) => x.clone()),
            this.toMap());
    }

    async add() {
        const addings = this.leaves.map((leaf) => leaf.add());
        addings.push((await this.table).put(this));
        await Promise.all(addings);
    }

    async remove() {
        const removings = this.leaves.map((leaf) => leaf.remove());
        removings.push((await this.table).remove(this.id()));
        await Promise.all(removings);
    }

    async update(dst: Report) {
        const diff = this.diff(this.leaves, dst.leaves);
        const addings = diff.onlyDst.map((x) => x.add());
        const removings = diff.onlySrc.map((x) => x.remove());
        const updatings = diff.common.map((p) => p.src.update(p.dst));
        const waits = _.flatten([addings, removings, updatings]);

        if (this.isNeedUpdate(dst)) {
            waits.push((await this.table).update(dst));
        }
        await Promise.all(waits);
    }

    private diff<X extends DBRecord<X>>(src: Array<X>, dst: Array<X>) {
        const notIncluded = (list: Array<X>) => (x: X) => _.every(list, (y) => y.id() != x.id());
        const parted = _.partition(dst, notIncluded(src));
        return {
            common: parted[1].map((d) => {
                const s = _.find(src, (x) => x.id() == d.id());
                return {
                    src: s,
                    dst: d
                };
            }),
            onlyDst: parted[0],
            onlySrc: _.filter(src, notIncluded(dst))
        };
    }
}
