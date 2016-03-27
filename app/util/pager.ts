
export interface Pager<T> {
    more(pageSize: number): Promise<Array<T>>;
    hasMore(): boolean;
}

export class PagingList<T> {
    constructor(private pager: Pager<T>, private pageSize: number) { }
    list: Array<T> = new Array();

    hasMore(): boolean {
        return this.pager.hasMore();
    }

    async more() {
        const adding = await this.pager.more(this.pageSize);
        adding.forEach((x) => this.list.push(x));
    }
}
