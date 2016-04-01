import {Photo, Images} from '../providers/reports/photo';

import {Cognito} from '../providers/aws/cognito';
import {Dynamo, DynamoTable, DBRecord, createRandomKey} from '../providers/aws/dynamo';
import * as DC from '../providers/aws/document_client.d';
import {assert} from '../util/assertion';
import {Logger} from '../util/logging';

const logger = new Logger(Leaf);

type LeafRecord = {
    COGNITO_ID: string,
    REPORT_ID: string,
    LEAF_ID: string,
    CONTENT: LeafContent
};
type LeafContent = {
    title: string,
    labels: string[],
    keywords: string[],
    description: string,
    description_upper: string
};

export class Leaf implements DBRecord<Leaf> {
    private static _table: Promise<DynamoTable<Leaf>>;
    static async table(dynamo: Dynamo): Promise<DynamoTable<Leaf>> {
        if (!this._table) {
            this._table = dynamo.createTable<Leaf>({
                tableName: 'LEAF',
                idColumnName: 'LEAF_ID',
                reader: (cognito: Cognito, photo: Photo) => async (src: LeafRecord) => {
                    logger.debug(() => `Reading Leaf from DB: ${JSON.stringify(src)}`);
                    if (!src) return null;
                    const images = photo.images(src.REPORT_ID, src.LEAF_ID);
                    if (!images.exists()) return null;
                    return new Leaf(src.REPORT_ID, src.LEAF_ID, src.CONTENT, images);
                },
                writer: (cognito: Cognito, photo: Photo) => async (obj) => {
                    const m: LeafRecord = {
                        COGNITO_ID: (await cognito.identity).identityId,
                        REPORT_ID: obj.reportId,
                        LEAF_ID: obj.id(),
                        CONTENT: obj.toMap()
                    };
                    return m;
                }
            });
        }
        return this._table;
    }

    static newEmpty(photo: Photo, reportId: string): Leaf {
        const id = createRandomKey();
        return new Leaf(
            reportId,
            id,
            {
                title: null,
                labels: [],
                keywords: [],
                description: null,
                description_upper: null
            },
            photo.images(reportId, id));
    }

    constructor(
        private reportId: string,
        private _id: string,
        private content: LeafContent,
        public photo: Images
    ) {
        assert('reportId', reportId);
        assert('id', _id);
        assert('content', content);
    }

    get table(): Promise<DynamoTable<Leaf>> {
        assert('Leaf$Table', Leaf._table);
        return Leaf._table;
    }

    loadContent(dst: LeafContent) {
        this.content = dst;
    }

    get title(): string {
        return this.content.title || "";
    }
    set title(v: string) {
        assert('title', v);
        this.content.title = v;
    }

    get labels(): Array<string> {
        return this.content.labels || [];
    }
    set labels(v: Array<string>) {
        assert('labels', v);
        this.content.labels = v;
    }

    get keywords(): Array<string> {
        return this.content.keywords || [];
    }
    set keywords(v: Array<string>) {
        assert('keywords', v);
        this.content.keywords = v;
    }

    get description(): string {
        return this.content.description || "";
    }
    set description(v: string) {
        assert('description', v);
        this.content.description = v;
    }

    toString(): string {
        return `REPORT_ID=${this.reportId}, LEAF_ID=${this.id()}, ${JSON.stringify(this.toMap(), null, 4)}`;
    }

    id(): string {
        return this._id;
    }

    toMap(): LeafContent {
        return {
            title: this.title.length > 0 ? this.title : null,
            labels: this.labels.map(_.identity),
            keywords: this.keywords.map(_.identity),
            description: this.description.length > 0 ? this.description : null,
            description_upper: this.description.length > 0 ? this.description.toUpperCase() : null
        };
    }

    isNeedUpdate(other: Leaf): boolean {
        return this.toString() != other.toString();
    }

    clone(): Leaf {
        return new Leaf(this.reportId, this._id, this.toMap(), this.photo);
    }

    async add() {
        await (await this.table).put(this);
    }

    async remove() {
        const db = (await this.table).remove(this.id());
        const s3 = this.photo.remove();
        await Promise.all([db, s3]);
    }

    async update(dst: Leaf) {
        if (this.isNeedUpdate(dst)) {
            await (await this.table).update(dst);
        }
    }
}
