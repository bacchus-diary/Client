import {Logger} from "./logging";

const logger = new Logger("Toast");

const plugins = (window as any).plugins;

export class Toast {
    static show(message: string, duration: string, position: string) {
        if (typeof plugins !== "undefined" && plugins.toast) {
            plugins.toast.show(message, duration, position);
        } else {
            logger.warn(() => `plugins.toast is not defined`);
        }
    }

    static showShortTop(message: string) {
        return this.show(message, "short", "top");
    }

    static showShortCenter(message: string) {
        return this.show(message, "short", "center");
    }

    static showShortBottom(message: string) {
        return this.show(message, "short", "bottom");
    }

    static showLongTop(message: string) {
        return this.show(message, "long", "top");
    }

    static showLongCenter(message: string) {
        return this.show(message, "long", "center");
    }

    static showLongBottom(message: string) {
        return this.show(message, "long", "bottom");
    }
}
