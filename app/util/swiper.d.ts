
/**
A partial interface for Swiper API
@see http://www.idangero.us/swiper/api/
*/
export interface Swiper {
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
