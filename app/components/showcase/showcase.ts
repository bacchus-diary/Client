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
    constructor(private ab: AnimationBuilder) { }

    @Input() leaves: Array<Leaf>;
    @Input() slideSpeed: number = 300;

    swiper: Swiper;
    swiperOptions = {
        speed: this.slideSpeed,
        onInit: (s) => {
            this.swiper = s;
        }
    }

    addPhoto() {
        PhotoShop.photo(true).subscribe((dataString) => {
            const leaf = new Leaf();
            const url = PhotoShop.makeUrl(PhotoShop.decodeBase64(dataString));
            logger.debug(() => `Photo URL: ${url}`);
            this.leaves.push(leaf);
        });
    }

    deletePhoto(index: number) {
        logger.debug(() => `Deleting photo: ${index}`);

        const getChild = (className: string) => {
            const slides = this.swiper.slides;
            if (slides.length - 1 > index) {
                const els = slides[index].getElementsByClassName(className);
                if (els.length > 0) {
                    return els[0] as HTMLElement;
                }
            }
            return null;
        }
        const floating = getChild('floating');
        const target = getChild('deletable');
        logger.debug(() => `Animate target: ${target}`);

        if (floating != null && target != null) {
            floating.style.display = 'none';

            const height = target.offsetHeight;
            const dur = this.slideSpeed * 2;
            const animation = this.ab.css();

            animation.setFromStyles({ opacity: '1' });
            animation.setToStyles({ opacity: '0', transform: `translateY(${height}px)` });
            animation.setDuration(dur);
            animation.start(target);
            logger.debug(() => `Animation started: ${height}px in ${dur}ms`);

            setTimeout(() => {
                this.slideNext();
            }, dur / 2);

            setTimeout(() => {
                this.swiper.removeSlide(index);
                this.leaves.splice(index, 1);
                this.swiper.update();
            }, dur);
        }
    }

    slidePrev() {
        this.swiper.slidePrev();
    }

    slideNext() {
        this.swiper.slideNext();
    }
}

/**
A partial interface for Swiper API
@see http://www.idangero.us/swiper/api/
*/
interface Swiper {
    /**
    Dom7/jQuery array-like collection of slides HTML elements. To get specific slide HTMLElement use mySwiper.slides[1]
    */
    slides: Array<HTMLElement>;

    /**
    This method includes updateContainerSize, updateSlidesSize, updateProgress, updatePagination and updateClasses methods

    You should call it after you add/remove slides manually, or after you hide/show it, or do any custom DOM modifications with Swiper

    updateTranslate - boolean - Set it to true (by default it is false) to hard set/reset/update Swiper wrapper translate. It is useful if you use not default effect or scrollbar. Optional
    This method also includes subcall of the following methods which you can use separately:

    mySwiper.updateContainerSize() - recalculate size of swiper container
    mySwiper.updateSlidesSize() - recalculate number of slides and their offsets. Useful after you add/remove slides with JavaScript
    mySwiper.updateProgress() - recalculate swiper progress
    mySwiper.updatePagination() - updates pagination layout and re-render bullets
    mySwiper.updateClasses() - update active/prev/next classes on slides and bullets
    */
    update(updateTranslate?: boolean);

    /**
    Run transition to next slide
    runCallbacks - boolean - Set it to false (by default it is true) and transition will not produce onSlideChange callback functions. Optional
    speed - number - transition duration (in ms). Optional
    */
    slideNext(runCallbacks?: boolean, speed?: number);

    /**
    Run transition to previous slide
    runCallbacks - boolean - Set it to false (by default it is true) and transition will not produce onSlideChange callback functions. Optional
    speed - number - transition duration (in ms). Optional
    */
    slidePrev(runCallbacks?: boolean, speed?: number);

    /**
    Remove selected slides. slideIndex could be a number with slide index to remove or array with indexes, for example:
    mySwiper.removeSlide(0); //remove first slide
    mySwiper.removeSlide([0, 1]); //remove first and second slides
    */
    removeSlide(slideIndex: number | Array<number>);
}
