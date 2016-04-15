import {Injectable} from 'angular2/core';

import {Report} from '../../model/report';
import {Leaf} from '../../model/leaf';
import {PagingReports} from './cached_list';
import {Cognito} from '../aws/cognito';
import {COGNITO_ID_COLUMN, Dynamo, DynamoTable, DBRecord, ExpressionMap} from '../aws/dynamo';
import {Pager} from '../../util/pager';
import {Logger} from '../../util/logging';

const logger = new Logger(SearchReports);

@Injectable()
export class SearchReports {
    constructor(private cognito: Cognito, private dynamo: Dynamo) { }

    async byWord(word: string): Promise<PagingReports> {
        const upper = word.toUpperCase();
        const table = await Report.table(this.dynamo)
        const pagerReports = await this.pagerByWord(upper, 'comment_upper', table);
        const pagerLeaves = await this.pagerByWord(upper, 'description_upper', await Leaf.table(this.dynamo));
        return new PagingReports(new MargedPager(table, pagerReports, pagerLeaves));
    }

    async pagerByWord<T extends DBRecord<T>>(word: string, attName: string, table: DynamoTable<T>): Promise<Pager<T>> {
        const mapping = new ExpressionMap();

        const nameCognitoId = mapping.addName(COGNITO_ID_COLUMN);
        const valueCognitoId = mapping.addValue((await this.cognito.identity).identityId);

        const content = mapping.addName('CONTENT');
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
        private reportTable: DynamoTable<Report>,
        private reportPager: Pager<Report>,
        private leafPager: Pager<Leaf>) { }

    hasMore(): boolean {
        return this.reportPager.hasMore() || this.leafPager.hasMore();
    }

    async more(pageSize: number): Promise<Array<Report>> {
        const reportsAwait = this.reportPager.more(pageSize / 2);
        const leaves = await this.leafPager.more(pageSize / 2)
        const reports = await reportsAwait;
        logger.debug(() => `Marging items: reports=${reports.length}, leaves=${leaves.length}`);

        const listId = _.filter(_.uniq(leaves.map((leaf) => leaf.reportId)),
            (id) => _.every(reports, (report) => report.id() != id));

        await Promise.all(listId.map(async (reportId) =>
            reports.push(await this.reportTable.get(reportId))));

        logger.debug(() => `Fount reports: ${reports.length}/${pageSize}`);
        return reports;
    }
}
