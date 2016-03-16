import {Page} from 'ionic-angular';
import {PhotoShop as ps} from "../../providers/photo_shop";

@Page({
    templateUrl: 'build/pages/photo/photo.html'
})
export class PhotoPage {
    photoUrl: string;

    takePhoto(take) {
        let data = ps.photo(take,
            (data) => {
                this.photoUrl = ps.makeUrl(ps.decodeBase64(data));
                console.log("Photo URL: " + this.photoUrl);
            },
            (error) => {
                console.log("Failed to take a photo: " + error);
            });
    }
}
