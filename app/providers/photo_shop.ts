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

    public static photo(take: boolean, resolve, reject) {
        let params = {
            correctOrientation: true,
            destinationType: Camera.DestinationType.DATA_URL,
            sourceType: take ? Camera.PictureSourceType.CAMERA : Camera.PictureSourceType.PHOTOLIBRARY
        };
        navigator.camera.getPicture(resolve, reject, params);
    }
}
