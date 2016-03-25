import {Camera} from 'ionic-native';

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

    public static photo(take: boolean): Promise<string> {
        return Camera.getPicture({
            correctOrientation: true,
            destinationType: 0, // DATA_URL
            sourceType: take ? 1 : 0 // CAMERA : PHOTOLIBRARY
        });
    }
}
