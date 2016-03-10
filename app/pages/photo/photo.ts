import {Page} from 'ionic-angular';
import {photo, makeUrl, decodeBase64} from '../../service/photo_shop.ts';

@Page({
  templateUrl: 'build/pages/photo/photo.html'
})
export class PhotoPage {
    photoUrl: string;
    
    async takePhoto(take) {
        let data = await photo(take);
        this.photoUrl = makeUrl(decodeBase64(data));
        console.log("Photo URL: " + this.photoUrl);
    }
}
