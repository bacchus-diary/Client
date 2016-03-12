import {Page} from 'ionic-angular';
import {photo, makeUrl, decodeBase64} from '../../service/photo_shop.ts';

@Page({
  templateUrl: 'build/pages/photo/photo.html'
})
export class PhotoPage {
    photoUrl: string;
    
    takePhoto(take) {
        let data = photo(take, (data) => {
            this.photoUrl = makeUrl(decodeBase64(data));
            console.log("Photo URL: " + this.photoUrl);
        },
        (error) => {
            console.log("Failed to take a photo: " + error);
        });
    }
}
