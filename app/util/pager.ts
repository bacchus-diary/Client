
export interface Pager<T> {
    more(pageSize: number): Promise<Array<T>>;
    hasMore(): boolean;
}

export interface PagingList<T> {
    list: Array<T>;
    hasMore(): boolean;
    more(): Promise<void>;
}
