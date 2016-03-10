
    let CONTENT_TYPE = "image/jpeg";
    
    export function makeUrl(data: Blob): string {
        return window.URL.createObjectURL(data);
    }
    
    export function decodeBase64(text: string): Blob {
        let data = window.atob(text);
        return new Blob([data], { type: CONTENT_TYPE });
    }
    
    export async function photo(take: boolean): Promise<string> {
        let params = {
            correctOrientation: true,
            destinationType: Camera.DestinationType.DATA_URL,
            sourceType: take ? Camera.PictureSourceType.CAMERA : Camera.PictureSourceType.PHOTOLIBRARY
        };
        return new Promise((resolve, reject) => { navigator.camera.getPicture(resolve, reject, params)});
    }
