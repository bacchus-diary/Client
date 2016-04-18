import {Alert, NavController, IONIC_DIRECTIVES} from 'ionic-angular';
import {Camera, Device} from 'ionic-native';
import {AnimationBuilder} from 'angular2/animate';
import {Component, Input, Output, EventEmitter} from 'angular2/core';

import {ElasticTextareaDirective} from '../elastic_textarea/elastic_textarea';
import {S3File} from '../../providers/aws/s3file';
import {Photo} from '../../providers/reports/photo';
import {EtiquetteVision} from '../../providers/cvision/etiquette';
import {Preferences} from '../../providers/config/preferences';
import {FATHENS_PROVIDERS} from '../../providers/all';
import {Leaf} from '../../model/leaf';
import {assert} from '../../util/assertion';
import {Dialog} from '../../util/backdrop';
import * as BASE64 from '../../util/base64';
import {Logger} from '../../util/logging';

const logger = new Logger(ShowcaseComponent);

@Component({
    selector: 'fathens-showcase',
    templateUrl: 'build/components/showcase/showcase.html',
    directives: [IONIC_DIRECTIVES, ElasticTextareaDirective],
    providers: [FATHENS_PROVIDERS]
})
export class ShowcaseComponent {
    constructor(
        private nav: NavController,
        private ab: AnimationBuilder,
        private s3file: S3File,
        private pref: Preferences,
        private etiquetteVision: EtiquetteVision,
        private urlGenerator: Photo) { }

    @Input() reportId: string;
    @Input() leaves: Array<Leaf>;
    @Input() slideSpeed: number = 300;
    @Input() confirmDelete: boolean = true;
    @Output() update = new EventEmitter<void>();

    private swiper: Swiper;
    swiperOptions = {
        speed: this.slideSpeed,
        onInit: (s) => {
            this.swiper = s;
        }
    }

    async addPhoto() {
        try {
            this.swiper.lockSwipes();

            const base64image = await this.getPhoto();
            const blob = BASE64.decodeBase64(base64image);
            const url = URL.createObjectURL(blob, { oneTimeOnly: true });
            logger.debug(() => `Photo URL: ${url}`);

            const leaf = await Leaf.withPhoto(url, this.reportId, this.urlGenerator);
            const index = this.leaves.push(leaf) - 1;
            this.swiper.update();

            const etiquette = await this.etiquetteVision.read(base64image);
            if (!etiquette || etiquette.isSafe()) {
                if (etiquette) {
                    etiquette.writeContent(leaf);
                    const slide = this.swiper.slides[index];
                    const textarea = slide.querySelector('ion-item.description ion-textarea textarea') as HTMLTextAreaElement;
                    if (textarea) setTimeout(() => {
                        logger.debug(() => `Kick event 'onInput' on ${textarea}(value=${textarea.value})`);
                        textarea.oninput(null);
                    }, 100);
                }
                this.s3file.upload(await leaf.photo.original.storagePath, blob);
                this.update.emit(null);
            } else {
                await new Promise<void>((resolve, reject) => {
                    this.nav.present(Alert.create({
                        title: 'Delete Photo',
                        message: 'This photo is seems to be inappropriate',
                        buttons: [{
                            text: 'Delete',
                            handler: async (data) => {
                                await this.doDeletePhoto(index);
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
            const leaf = await this.doDeletePhoto(index);
            await leaf.remove();
            this.update.emit(null);
        }
    }

    private async confirmDeletion(): Promise<boolean> {
        if (this.confirmDelete) {
            return await Dialog.confirm(this.nav, 'Remove Photo', 'Are you sure to remove this photo ?', { ok: 'delete' });
        } else {
            return true;
        }
    }

    private async doDeletePhoto(index: number): Promise<Leaf> {
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

        assert('floating', floating);
        assert('deletable', target);

        return new Promise<Leaf>((resolve, reject) => {
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
                const leaf = this.leaves.splice(index, 1)[0];
                this.swiper.update();
                resolve(leaf);
            }, dur);
        });
    }

    slidePrev() {
        this.swiper.slidePrev();
    }

    slideNext() {
        this.swiper.slideNext();
    }

    private async getPhoto(): Promise<string> {
        let take = await this.pref.getAlwaysTake();
        if (!take) {
            take = await Dialog.confirm(this.nav, 'Camera', '"TAKE" photo or "CHOOSE" from library', { ok: 'take', cancel: 'choose' });
            if (take) {
                this.pref.incrementCountTake();
            } else {
                this.pref.clearCountTake();
            }
        }
        return this.doGetPhoto(take);
    }

    private doGetPhoto(take: boolean): Promise<string> {
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
                                        resolve(await BASE64.encodeBase64(file));
                                    }
                                } catch (ex) {
                                    logger.warn(() => `Error on read file: ${ex}`);
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
