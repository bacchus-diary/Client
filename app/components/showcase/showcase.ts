import {IONIC_DIRECTIVES} from 'ionic-angular';
import {Component, Input, Output, EventEmitter} from 'angular2/core';

import {Leaf} from '../../model/report';
import {PhotoShop} from '../../providers/photo_shop';
import {Logger} from '../../providers/logging';

const logger = new Logger(ShowcaseComponent);

@Component({
    selector: 'fathens-showcase',
    templateUrl: 'build/components/showcase/showcase.html',
    directives: [IONIC_DIRECTIVES]
})
export class ShowcaseComponent {
    @Input() leaves: Array<Leaf>;

    addPhoto() {
        PhotoShop.photo(true).subscribe((dataString) => {
            const leaf = new Leaf();
            const url = PhotoShop.makeUrl(PhotoShop.decodeBase64(dataString));
            logger.debug(() => `Photo URL: ${url}`);
            leaf.photo.reduced.mainview.url = url;
            this.leaves.push(leaf);
        });
    }

    deletePhoto(index: number) {
        logger.debug(() => `Deleting photo: ${index}`);s
    }
}
