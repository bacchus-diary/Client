import {Photo, Images} from '../providers/reports/photo';

import {Leaf} from './leaf';
import {Cognito} from '../providers/aws/cognito';
import {Dynamo, DynamoTable, DBRecord, createRandomKey, equalsTo} from '../providers/aws/dynamo';
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
    private static table: Promise<DynamoTable<Report>>;
    static async createTable(cognito: Cognito, dynamo: Dynamo, photo: Photo): Promise<DynamoTable<Report>> {
        if (!this.table) {
            this.table = dynamo.createTable<Report>('REPORT', 'REPORT_ID', async (src: ReportRecord) => {
                logger.debug(() => `Reading Report from DB: ${JSON.stringify(src)}`);
                if (!src) return null;
                const leafTable = await Leaf.createTable(cognito, dynamo, photo);
                const keys = new Map<string, string>();
                keys['COGNITO_ID'] = (await cognito.identity).identityId;
                keys['REPORT_ID'] = src.REPORT_ID;
                const rels = await leafTable.query(keys, 'COGNITO_ID-REPORT_ID-index');
                if (_.isEmpty(rels)) return null;
                const indexed = src.CONTENT.LEAF_INDEXES.map((leafId) => rels.find((leaf) => leaf.id() == leafId));
                const leaves = _.union(_.compact(indexed), rels);
                return new Report(src.REPORT_ID, new Date(src.DATE_AT), leaves, src.CONTENT);
            }, async (obj) => {
                const m: ReportRecord = {
                    COGNITO_ID: (await cognito.identity).identityId,
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

    async add() {
        const addings = this.leaves.map((leaf) => leaf.add());
        addings.push((await Report.table).put(this));
        await Promise.all(addings);
    }

    async remove() {
        const removings = this.leaves.map((leaf) => leaf.remove());
        removings.push((await Report.table).remove(this.id()));
        await Promise.all(removings);
    }

    async update(dst: Report) {
        const diff = this.diff(this.leaves, dst.leaves);
        const addings = diff.onlyDst.map((x) => x.add());
        const removings = diff.onlySrc.map((x) => x.remove());
        const updatings = diff.common.map((p) => p.src.update(p.dst));
        const waits = _.flatten([addings, removings, updatings]);

        if (this.isNeedUpdate(dst)) {
            waits.push((await Report.table).update(dst));
        }
        await Promise.all(waits);
    }

    private diff<X extends DBRecord<X>>(src: Array<X>, dst: Array<X>) {
        const includedIn = (list: Array<X>) => (x: X) => _.some(list, equalsTo(x));
        const parted = _.partition(dst, includedIn(src));
        return {
            common: parted[0].map((d) => {
                const s = _.find(src, equalsTo(d));
                return {
                    src: s,
                    dst: d
                };
            }),
            onlyDst: parted[1],
            onlySrc: _.filter(src, includedIn(dst))
        };
    }
}
