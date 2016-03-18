import {IONIC_DIRECTIVES} from 'ionic-angular';
import {AnimationBuilder} from 'angular2/animate';
import {Component, Input, ElementRef} from 'angular2/core';

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
    constructor(private ab: AnimationBuilder, private ref: ElementRef) { }

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

    deletingIndex: number = -1;

    deletePhoto(index: number) {
        logger.debug(() => `Deleting photo: ${index}`);
        this.deletingIndex = index;

        const target: HTMLElement = this.ref.nativeElement.querySelector(`.deletable.index-${index}`);
        logger.debug(() => `Animate target: ${target}`);
        if (target != null) {
            const dur = 600;
            const animation = this.ab.css();
            animation.setFromStyles({ opacity: '1' });
            animation.setToStyles({ opacity: '0', transform: 'translateY(500px)' });
            animation.setDuration(dur);
            animation.start(target);
            logger.debug(() => `Animation started`);
            setTimeout(() => {
                this.leaves.splice(index, 1);
            }, dur)
        }
    }
}
