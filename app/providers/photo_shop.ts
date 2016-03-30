import {Injectable} from 'angular2/core';

import {Alert, NavController} from 'ionic-angular';
import {Camera, Device} from 'ionic-native';

import {Logger} from '../util/logging';

const logger = new Logger(PhotoShop);

@Injectable()
export class PhotoShop {
    public static CONTENT_TYPE = "image/jpeg";

    constructor(private nav: NavController) { }

    makeUrl(data: Blob): string {
        logger.debug(() => `Photo Blob: ${data}`);
        return URL.createObjectURL(data, { oneTimeOnly: true });
    }

    decodeBase64(text: string, sliceSize?: number): Blob {
        sliceSize = sliceSize || 512;
        const data = atob(text);
        const arrays = [];
        for (let offset = 0; offset < data.length; offset += sliceSize) {
            const slice = data.slice(offset, offset + sliceSize);
            const array = new Array(slice.length);
            _.range(slice.length).forEach((i) => array[i] = slice.charCodeAt(i));
            arrays.push(new Uint8Array(array));
        }
        return new Blob(arrays, { type: PhotoShop.CONTENT_TYPE });
    }

    encodeBase64(data: Blob): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsBinaryString(data);
            reader.onerror = () => reject(reader.error);
            reader.onloadend = () => resolve(btoa(reader.result));
        });
    }

    public photo(take: boolean): Promise<string> {
        if (Device.device.cordova) {
            return Camera.getPicture({
                correctOrientation: true,
                destinationType: 0, // DATA_URL
                sourceType: take ? 1 : 0 // CAMERA : PHOTOLIBRARY
            });
        } else {
            return new Promise<string>((resolve, reject) => {
                this.nav.present(Alert.create({
                    title: 'Choose image file',
                    inputs: [
                        {
                            type: 'file',
                            name: 'file'
                        }
                    ],
                    buttons: [
                        {
                            text: 'Cancel',
                            handler: (data) => {
                                logger.debug(() => `Cenceled: ${JSON.stringify(data)}`);
                                reject('Cancel');
                            }
                        },
                        {
                            text: 'Ok',
                            handler: async (data) => {
                                try {
                                    const elm = document.querySelector("ion-alert input.alert-input[type='file']") as HTMLInputElement;
                                    if (elm && elm.files.length > 0) {
                                        const file = elm.files[0];
                                        logger.debug(() => `Choosed file: ${JSON.stringify(file)}`);
                                        resolve(await this.encodeBase64(file));
                                    }
                                } catch (ex) {
                                    logger.debug(() => `Error on read file: ${ex}`);
                                    reject(ex);
                                }
                            }
                        }
                    ]
                }));
            });
        }
    }
}
