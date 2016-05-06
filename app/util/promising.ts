import {Observable} from "rxjs/Rx";

export function toPromise<T>(o: Observable<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        o.subscribe(resolve, reject);
    });
}
