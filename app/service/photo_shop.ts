
let CONTENT_TYPE = "image/jpeg";

export function makeUrl(data: Blob): string {
    console.log("Photo Blob: " + data);
    return window.URL.createObjectURL(data);
}

export function decodeBase64(text: string): Blob {
    let data = window.atob(text);
    return new Blob([data], { type: CONTENT_TYPE });
}

export function photo(take: boolean, resolve, reject) {
    let params = {
        correctOrientation: true,
        destinationType: Camera.DestinationType.DATA_URL,
        sourceType: take ? Camera.PictureSourceType.CAMERA : Camera.PictureSourceType.PHOTOLIBRARY
    };
    navigator.camera.getPicture(resolve, reject, params);
}
