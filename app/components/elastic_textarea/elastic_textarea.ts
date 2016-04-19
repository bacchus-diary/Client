import {Directive} from 'angular2/core';
import {ElementRef} from 'angular2/core';
import {Logger} from '../../util/logging';

const logger = new Logger(ElasticTextareaDirective);

@Directive({
    selector: '[elastic]'
})
export class ElasticTextareaDirective {
    constructor(private ref: ElementRef) { }

    private textarea: HTMLTextAreaElement;
    private mirror: HTMLTextAreaElement;

    async ngOnInit() {
        this.textarea = await new Promise<HTMLTextAreaElement>((resolve, reject) => {
            const e: HTMLElement = this.ref.nativeElement;
            logger.debug(() => `Creating ElasticTextarea in : ${e.nodeName}`);
            if (e.nodeName == 'TEXTAREA') {
                resolve(e as HTMLTextAreaElement);
            } else {
                const t = e.querySelector('textarea') as HTMLTextAreaElement;
                if (t) {
                    resolve(t);
                } else {
                    reject(`No 'textarea' in ${e}(${e.nodeName})`);
                }
            }
        });
        logger.debug(() => `Creating ElasticTextarea: ${this.textarea}`);
        this.mirror = makeMirror(this.textarea);

        this.textarea.oninput = (event) => this.onChange();
        this.onChange();
    }

    async ngOnDestroy() {
        logger.debug(() => `Destroying ElasticTextarea...`);
        this.mirror.remove();
    }

    private onChange() {
        this.mirror.value = this.textarea.value;
        const s = this.mirror.scrollHeight;
        if (this.textarea.offsetHeight != s) {
            this.textarea.style.height = `${s}px`;
        }
    }
}

function makeMirror(origin: HTMLTextAreaElement): HTMLTextAreaElement {
    const m = document.createElement('textarea') as HTMLTextAreaElement;

    m.style.cssText = getComputedStyle(origin).cssText;
    m.style.visibility = 'hidden';
    m.value = origin.value;
    m.setAttribute('aria-hidden', 'true');

    document.body.appendChild(m);
    return m;
}
