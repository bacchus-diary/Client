export interface Pager<T> {
    more(pageSize: number): Promise<Array<T>>;
    hasMore(): boolean;
}
