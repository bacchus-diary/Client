
export class Photo {
    original: Image = new Image();
    reduced: ReducedImages = new ReducedImages();
}

class ReducedImages {
    mainview: Image = new Image();
    thumbnail: Image = new Image();
}

class Image {
    url: string = 'http://www.lcbo.com/content/dam/lcbo/products/316844.jpg/jcr:content/renditions/cq5dam.web.1280.1280.jpeg';
}
