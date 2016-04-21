import {Pager} from '../../../util/pager';
import {Logger} from '../../../util/logging';

import * as DC from './document_client.d';
import {DBRecord} from './dynamo';
import {DynamoTable, TableKey} from './table';
import {Expression} from './expression';

const logger = new Logger('DBPager');

export class LastEvaluatedKey {
    private _value: DC.Item;

    get value(): DC.Item {
        return this._value;
    }

    set value(v: DC.Item) {
        logger.debug(() => `Loaded LastEvaluatedKey: ${JSON.stringify(v)}`)
        this._value = v ? v : {};
    }

    get isOver(): boolean {
        return this._value && _.isEmpty(this._value);
    }

    reset() {
        this._value = null;
    }
}

abstract class DBPager<R extends DC.Item, T extends DBRecord<T>> implements Pager<T> {
    constructor(protected table: DynamoTable<R, T>) { }
    protected last: LastEvaluatedKey = new LastEvaluatedKey();
    private asking: Promise<Array<T>>;

    hasMore(): boolean {
        return !this.last.isOver;
    }

    reset() {
        this.last.reset();
    }

    async more(pageSize: number): Promise<Array<T>> {
        if (pageSize < 1 || !this.hasMore()) return [];
        if (this.asking) await this.asking;
        this.asking = this.doMore(pageSize);
        return await this.asking;
    }

    protected abstract async doMore(pageSize: number): Promise<Array<T>>;
}

export class PagingQuery<R extends DC.Item, T extends DBRecord<T>> extends DBPager<R, T> {
    constructor(
        table: DynamoTable<R, T>,
        private indexName: string,
        private hashKey: TableKey,
        private isForward: boolean
    ) {
        super(table);
    }

    protected async doMore(pageSize: number): Promise<Array<T>> {
        return this.table.query(
            this.hashKey,
            this.indexName,
            this.isForward,
            pageSize,
            this.last
        );
    }
}

export class PagingScan<R extends DC.Item, T extends DBRecord<T>> extends DBPager<R, T> {
    constructor(
        table: DynamoTable<R, T>,
        private exp: Expression
    ) {
        super(table);
    }
    protected async doMore(pageSize: number): Promise<Array<T>> {
        return this.table.scan(
            this.exp,
            pageSize,
            this.last
        );
    }
}
