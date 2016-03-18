
export class Photo {
    original: Image = new Image();
    reduced: ReducedImages = new ReducedImages();
}

class ReducedImages {
    mainview: Image = new Image();
    thumbnail: Image = new Image();
}

class Image {
    url: string = 'http://www.ginfoundry.com/wp-content/uploads/2013/10/lavender-sapphire-collins-770x1024-min.jpg';
}
