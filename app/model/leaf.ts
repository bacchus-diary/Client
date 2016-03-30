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
    labels: string[],
    description: string,
    description_upper: string
};

export class Leaf implements DBRecord<Leaf> {
    private static table: Promise<DynamoTable<Leaf>>;
    static async createTable(cognito: Cognito, dynamo: Dynamo, photo: Photo): Promise<DynamoTable<Leaf>> {
        if (!this.table) {
            this.table = dynamo.createTable<Leaf>('LEAF', 'LEAF_ID', async (src: LeafRecord) => {
                logger.debug(() => `Reading Leaf from DB: ${JSON.stringify(src)}`);
                if (!src) return null;
                const result = new Leaf(src.REPORT_ID, src.LEAF_ID, src.CONTENT);
                if (!result.photo(photo).exists()) return null;
                return result;
            }, async (obj) => {
                return {
                    COGNITO_ID: (await cognito.identity).identityId,
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

    async add() {
        await (await Leaf.table).put(this);
    }

    async remove() {
        const db = (await Leaf.table).remove(this.id());
        if (this._images) await this._images.remove();
        await db;
    }

    async update(dst: Leaf) {
        if (this.isNeedUpdate(dst)) {
            await (await Leaf.table).update(dst);
        }
    }

    private _images: Images;

    photo(photo: Photo): Images {
        if (!this._images) {
            this._images = photo.images(this.reportId, this.id())
        }
        return this._images;
    }
}
