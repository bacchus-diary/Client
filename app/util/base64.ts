
export function decodeBase64(text: string, opt?: { sliceSize?: number, contentType?: string }): Blob {
    let sliceSize = 512;
    let contentType = 'image/jpeg';
    if (opt) {
        if (opt.sliceSize) sliceSize = opt.sliceSize;
        if (opt.contentType) contentType = opt.contentType;
    }
    const data = atob(text);
    const arrays = [];
    for (let offset = 0; offset < data.length; offset += sliceSize) {
        const slice = data.slice(offset, offset + sliceSize);
        const array = new Array(slice.length);
        _.range(slice.length).forEach((i) => array[i] = slice.charCodeAt(i));
        arrays.push(new Uint8Array(array));
    }
    return new Blob(arrays, { type: contentType });
}

export function encodeBase64(data: Blob): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsBinaryString(data);
        reader.onerror = () => reject(reader.error);
        reader.onloadend = () => resolve(btoa(reader.result));
    });
}

export function encodeJson(obj: any): string {
    return btoa(encodeURIComponent(JSON.stringify(obj)));
}

export function decodeJson(base64: string): any {
    return JSON.parse(decodeURIComponent(atob(base64)));
}
