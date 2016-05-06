import {Photo, Images} from "../providers/reports/photo";
import {Camera, Device} from "ionic-native";

import {Cognito} from "../providers/aws/cognito";
import {Dynamo, DBRecord, createRandomKey} from "../providers/aws/dynamo/dynamo";
import {DynamoTable} from "../providers/aws/dynamo/table";
import {assert} from "../util/assertion";
import {Logger} from "../util/logging";

const logger = new Logger("Leaf");

export type LeafRecord = {
    COGNITO_ID: string,
    REPORT_ID: string,
    LEAF_ID: string,
    LAST_MODIFIED?: number,
    CONTENT: LeafContent
};
type LeafContent = {
    labels: string[],
    logos: string[],
    keywords: string[],
    description: string,
    description_upper: string
};

export class Leaf implements DBRecord<Leaf> {
    private static _table: Promise<DynamoTable<LeafRecord, Leaf>>;
    static async table(dynamo: Dynamo): Promise<DynamoTable<LeafRecord, Leaf>> {
        if (!this._table) {
            this._table = dynamo.createTable<LeafRecord, Leaf>((cognito, photo) => {
                if (!Device.device.cordova) this.cleanup(photo);
                return {
                    tableName: "LEAF",
                    idColumnName: "LEAF_ID",
                    reader: async (src: LeafRecord) => {
                        logger.debug(() => `Reading Leaf from DB: ${JSON.stringify(src)}`);
                        if (!src) return null;
                        const images = await photo.images(src.REPORT_ID, src.LEAF_ID);
                        const ok = await images.exists();
                        if (!ok) {
                            logger.debug(() => `This leaf has no images: ${JSON.stringify(src)}`);
                            (await this._table).remove(src.LEAF_ID);
                            return null;
                        }
                        return new Leaf(src.REPORT_ID, src.LEAF_ID, src.CONTENT, images);
                    },
                    writer: async (obj) => {
                        const m: LeafRecord = {
                            COGNITO_ID: (await cognito.identity).identityId,
                            REPORT_ID: obj._reportId,
                            LEAF_ID: obj.id(),
                            CONTENT: obj.toMap()
                        };
                        return m;
                    }
                };
            });
        }
        return this._table;
    }

    static async withPhoto(original: string, reportId: string, photo: Photo): Promise<Leaf> {
        const id = createRandomKey();
        return new Leaf(
            reportId,
            id,
            {
                labels: [],
                logos: [],
                keywords: [],
                description: null,
                description_upper: null
            },
            await photo.images(reportId, id, original));
    }

    private static cleanuped: Promise<void> = null;
    private static async cleanup(photo: Photo) {
        if (!this.cleanuped) {
            this.cleanuped = photo.cleanup(async (images) => {
                const leaf = await (await Leaf._table).get(images.leafId);
                return (leaf !== null && leaf.reportId === images.reportId)
            });
        }
    }

    constructor(
        private _reportId: string,
        private _id: string,
        private content: LeafContent,
        public photo: Images
    ) {
        assert("reportId", _reportId);
        assert("id", _id);
        assert("content", content);
        assert("images", photo);
    }

    get table(): Promise<DynamoTable<LeafRecord, Leaf>> {
        assert("Leaf$Table", Leaf._table);
        return Leaf._table;
    }

    get reportId(): string {
        return this._reportId;
    }

    get logos(): Array<string> {
        return this.content.logos || [];
    }
    set logos(v: Array<string>) {
        assert("logos", v);
        this.content.logos = v;
    }

    get labels(): Array<string> {
        return this.content.labels || [];
    }
    set labels(v: Array<string>) {
        assert("labels", v);
        this.content.labels = v;
    }

    get keywords(): Array<string> {
        return this.content.keywords || [];
    }
    set keywords(v: Array<string>) {
        assert("keywords", v);
        this.content.keywords = v;
    }

    get description(): string {
        return this.content.description || "";
    }
    set description(v: string) {
        assert("description", v);
        const original = this.description;
        this.content.description = v;

        if (original.length > 0 && this.keywords.length > 0) {
            logger.debug(() => `Changed description: ${original} => ${v}`);
            const srcList = original.split("\n");
            const dstList = v.split("\n");
            if (srcList.length === dstList.length) {
                _.zip(srcList, dstList).map(([src, dst]) => {
                    if (src !== dst && _.includes(this.keywords, src)) {
                        logger.debug(() => `Change keyword: ${src} => ${dst}`);
                        this.keywords.splice(this.keywords.indexOf(src), 1, dst);
                    }
                })
            } else if (srcList.length > dstList.length) {
                srcList.filter((line) => _.every(dstList, (dst) => dst !== line)).forEach((word) => {
                    logger.debug(() => `Remove keyword: ${word}`);
                    _.pull(this.keywords, word);
                });
            }
        }
    }

    toString(): string {
        return `REPORT_ID=${this._reportId}, LEAF_ID=${this.id()}, ${JSON.stringify(this.toMap(), null, 4)}`;
    }

    id(): string {
        return this._id;
    }

    private toMap(): LeafContent {
        return {
            labels: this.labels.map(_.identity),
            logos: this.logos.map(_.identity),
            keywords: this.keywords.map(_.identity),
            description: this.description.length > 0 ? this.description : null,
            description_upper: this.description.length > 0 ? this.description.toUpperCase() : null
        };
    }

    async put() {
        await (await this.table).put(this);
    }

    async remove() {
        const db = (await this.table).remove(this.id());
        const s3 = this.photo.remove();
        await Promise.all([db, s3]);
    }
}
