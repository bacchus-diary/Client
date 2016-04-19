import {NavController, IONIC_DIRECTIVES} from 'ionic-angular';
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
import {Dialog, Spinner} from '../../util/backdrop';
import * as BASE64 from '../../util/base64';
import {Swiper} from '../../util/swiper.d';
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

    slidePrev() {
        this.swiper.slidePrev();
    }

    slideNext() {
        this.swiper.slideNext();
    }

    private async isTakePhoto(): Promise<boolean> {
        let take = await this.pref.getAlwaysTake();
        if (!take) {
            take = await Dialog.confirm(this.nav, 'Camera', '"TAKE" photo or "CHOOSE" from library', { ok: 'TAKE', cancel: 'CHOOSE' });
            if (take) {
                this.pref.incrementCountTake();
            } else {
                this.pref.clearCountTake();
            }
        }
        return take;
    }

    async addPhoto() {
        try {
            this.swiper.lockSwipes();

            const take = await this.isTakePhoto();
            let base64image;
            if (!Device.device.cordova) {
                const file = await Dialog.file(this.nav, 'Choose image file');
                base64image = await BASE64.encodeBase64(file);
            }
            const {blob, index, leaf, etiquette} = await Spinner.within(this.nav, 'Loading...', async () => {
                if (Device.device.cordova) {
                    base64image = await Camera.getPicture({
                        correctOrientation: true,
                        destinationType: 0, // DATA_URL
                        sourceType: take ? 1 : 0 // CAMERA : PHOTOLIBRARY
                    });
                }
                const blob = BASE64.decodeBase64(base64image);
                const url = URL.createObjectURL(blob, { oneTimeOnly: true });
                logger.debug(() => `Photo URL: ${url}`);

                const leaf = await Leaf.withPhoto(url, this.reportId, this.urlGenerator);
                const index = this.leaves.push(leaf) - 1;
                this.swiper.update();

                return { blob: blob, index: index, leaf: leaf, etiquette: await this.etiquetteVision.read(base64image) };
            });
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
                await Dialog.alert(this.nav, 'Delete Photo', 'This photo is seems to be inappropriate', 'Delete');
                await this.doDeletePhoto(index);
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
            return await Dialog.confirm(this.nav, 'Remove Photo', 'Are you sure to remove this photo ?', { ok: 'Delete' });
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
}
