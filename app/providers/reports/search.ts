import {Injectable} from "angular2/core";

import {ReportRecord, Report} from "../../model/report";
import {Leaf} from "../../model/leaf";
import {Cognito} from "../aws/cognito";
import * as DC from "../aws/dynamo/document_client.d";
import {COGNITO_ID_COLUMN, Dynamo, DBRecord} from "../aws/dynamo/dynamo";
import {DynamoTable} from "../aws/dynamo/table";
import {ExpressionMap} from "../aws/dynamo/expression";
import {PagingReports} from "./cached_list";
import {Pager, PagingList} from "../../util/pager";
import {Logger} from "../../util/logging";

const logger = new Logger("SearchReports");

const PAGE_SIZE = 10;

@Injectable()
export class SearchReports {
    constructor(private cognito: Cognito, private dynamo: Dynamo) { }

    async byWord(word: string): Promise<PagingList<Report>> {
        const upper = word.toUpperCase();
        const table = await Report.table(this.dynamo)
        const pagerReports = await this.pagerByWord(upper, "comment_upper", table);
        const pagerLeaves = await this.pagerByWord(upper, "description_upper", await Leaf.table(this.dynamo));
        return new PagingReports(new MargedPager(table, pagerReports, pagerLeaves));
    }

    async pagerByWord<R extends DC.Item, T extends DBRecord<T>>(word: string, attName: string, table: DynamoTable<R, T>): Promise<Pager<T>> {
        const mapping = new ExpressionMap();

        const nameCognitoId = mapping.addName(COGNITO_ID_COLUMN);
        const valueCognitoId = mapping.addValue((await this.cognito.identity).identityId);

        const content = mapping.addName("CONTENT");
        const upper = mapping.addName(attName);
        const value = mapping.addValue(word);

        return table.scanPager({
            express: `${nameCognitoId} = ${valueCognitoId} AND contains (${content}.${upper}, ${value})`,
            keys: {
                names: mapping.names,
                values: mapping.values
            }
        });
    }
}

class MargedPager implements Pager<Report> {
    constructor(
        private reportTable: DynamoTable<ReportRecord, Report>,
        private reportPager: Pager<Report>,
        private leafPager: Pager<Leaf>) { }

    hasMore(): boolean {
        return this.reportPager.hasMore() || this.leafPager.hasMore();
    }

    reset() {
        this.reportPager.reset();
        this.leafPager.reset();
    }

    async more(pageSize: number): Promise<Array<Report>> {
        const reportsAwait = this.reportPager.more(pageSize / 2);
        const leaves = await this.leafPager.more(pageSize / 2)
        const reports = await reportsAwait;
        logger.debug(() => `Marging items: reports=${reports.length}, leaves=${leaves.length}`);

        const addings = _.filter(_.uniq(leaves.map((leaf) => leaf.reportId)),
            (id) => _.every(reports, (x) => x.id() !== id)
        ).map(async (id) => await this.reportTable.get(id));

        _.compact(await Promise.all(addings)).forEach((x) => reports.push(x));

        logger.debug(() => `Found reports: ${reports.length}/${pageSize}`);
        return reports;
    }
}
