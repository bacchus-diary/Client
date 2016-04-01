import {Alert, NavController, IONIC_DIRECTIVES} from 'ionic-angular';
import {AnimationBuilder} from 'angular2/animate';
import {Component, Input, ElementRef} from 'angular2/core';

import {S3File} from '../../providers/aws/s3file';
import {Photo} from '../../providers/reports/photo';
import {CVision, Likelihood} from '../../providers/cvision/cvision';
import {PhotoShop} from '../../providers/photo_shop';
import {FATHENS} from '../../providers/all';
import {Leaf} from '../../model/leaf';
import {Logger} from '../../util/logging';

const logger = new Logger(ShowcaseComponent);

@Component({
    selector: 'fathens-showcase',
    templateUrl: 'build/components/showcase/showcase.html',
    directives: [IONIC_DIRECTIVES],
    providers: [FATHENS]
})
export class ShowcaseComponent {
    constructor(
        private nav: NavController,
        private ab: AnimationBuilder,
        private s3file: S3File,
        private cvision: CVision,
        private photoShop: PhotoShop,
        private urlGenerator: Photo) { }

    @Input() reportId: string;
    @Input() leaves: Array<Leaf>;
    @Input() slideSpeed: number = 300;
    @Input() confirmDelete: boolean = true;

    private swiper: Swiper;
    swiperOptions = {
        speed: this.slideSpeed,
        onInit: (s) => {
            this.swiper = s;
        }
    }

    private async readPhoto(leaf: Leaf, base64image: string): Promise<boolean> {
        try {
            const annon = await this.cvision.request(base64image, {
                LABEL_DETECTION: 10,
                LOGO_DETECTION: 3,
                TEXT_DETECTION: 10,
                SAFE_SEARCH_DETECTION: 1
            });
            logger.debug(() => `Read photo: ${JSON.stringify(annon, null, 4)}`)
            if (annon.responses.length > 0) {
                const res = annon.responses[0];

                const safe = res.safeSearchAnnotation;
                const guides = [safe.adult, safe.medical, safe.violence];
                logger.debug(() => `Checking safety: ${guides}`);
                if (_.some(guides, (value) => Likelihood.POSSIBLE < Likelihood[value])) {
                    return false;
                }

                const logo = (_.head(res.logoAnnotations) || {} as any).description;
                const text = (_.head(res.textAnnotations) || {} as any).description;
                logger.debug(() => `Texts on photo: ${JSON.stringify({ logo: logo, text: text })}`);

                leaf.description = _.compact([logo, text]).join("\n\n");
                leaf.labels = (res.labelAnnotations || []).map((x) => x.description);
            }
        } catch (ex) {
            logger.warn(() => `Error on requesting cvision: ${ex}`);
        }
        return true;
    }

    async addPhoto() {
        try {
            this.swiper.lockSwipes();

            const base64image = await this.photoShop.photo(true);
            const blob = this.photoShop.decodeBase64(base64image);
            const url = this.photoShop.makeUrl(blob);
            logger.debug(() => `Photo URL: ${url}`);

            const leaf = Leaf.newEmpty(this.urlGenerator, this.reportId);
            leaf.photo.reduced.mainview.url = url;
            const index = this.leaves.push(leaf) - 1;
            this.swiper.update();

            const isSafe = await this.readPhoto(leaf, base64image);
            if (isSafe) {
                this.s3file.upload(await leaf.photo.original.storagePath, blob);
            } else {
                await new Promise<void>((resolve, reject) => {
                    this.nav.present(Alert.create({
                        title: 'Delete Photo',
                        message: 'This photo is seems to be inappropriate',
                        buttons: [{
                            text: 'Delete',
                            handler: async (data) => {
                                await this.doDeletePhoto(index);
                                this.leaves.splice(index, 1);
                                resolve();
                            }
                        }]
                    }));
                });
            }
        } catch (ex) {
            logger.warn(() => `Error on adding photo: ${ex}`);
        } finally {
            this.swiper.unlockSwipes();
        }
    }

    async deletePhoto(index: number) {
        const ok = await this.confirmDeletion();
        if (ok) {
            await this.doDeletePhoto(index);
            const leaf = this.leaves.splice(index, 1)[0];
            await leaf.remove();
        }
    }

    private confirmDeletion(): Promise<boolean> {
        return new Promise((resolve, reject) => {
            if (this.confirmDelete) {
                this.nav.present(Alert.create({
                    title: 'Remove Photo',
                    message: 'Are you sure to remove this photo ?',
                    buttons: [
                        {
                            text: 'Cancel',
                            role: 'cancel',
                            handler: () => {
                                resolve(false);
                            }
                        },
                        {
                            text: 'Delete',
                            handler: () => {
                                resolve(true);
                            }
                        }
                    ]
                }));
            } else resolve(true);
        });
    }

    private async doDeletePhoto(index: number) {
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
            return new Promise<void>((resolve, reject) => {
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
                    resolve();
                }, dur);
            });
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

    /**
    Disable (lock) ability to change slides
    */
    lockSwipes();
    /**
    Enable (unlock) ability to change slides
    */
    unlockSwipes();
}
