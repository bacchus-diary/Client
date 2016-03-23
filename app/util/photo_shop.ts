import {Camera} from 'ionic-native';
import {Observable} from 'rxjs/Rx';

export class PhotoShop {
    public static CONTENT_TYPE = "image/jpeg";

    public static makeUrl(data: Blob): string {
        console.log("Photo Blob: " + data);
        return window.URL.createObjectURL(data);
    }

    public static decodeBase64(text: string): Blob {
        let data = window.atob(text);
        return new Blob([data], { type: PhotoShop.CONTENT_TYPE });
    }

    public static photo(take: boolean): Observable<string> {
        return Observable.fromPromise(Camera.getPicture({
            correctOrientation: true,
            destinationType: 0, // DATA_URL
            sourceType: take ? 1 : 0 // CAMERA : PHOTOLIBRARY
        }));
    }
}
