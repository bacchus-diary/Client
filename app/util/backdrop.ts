import {Alert, Loading, NavController} from 'ionic-angular';

export class Overlay {
    static async  wait(nav: NavController, interval?: number): Promise<void> {
        await new Promise(async (resolve, reject) => {
            const ms = interval || 100;
            while (nav.hasOverlay()) {
                await new Promise((ok, ng) => setTimeout(ok, ms));
            }
            resolve();
        });
    }
}

export class Dialog {
    static async alert(nav: NavController, title: string, msg: string, buttonText?: string): Promise<void> {
        buttonText = buttonText || 'OK';
        await new Promise((resolve, reject) => {
            nav.present(Alert.create({
                title: title,
                message: msg,
                buttons: [
                    {
                        text: buttonText,
                        handler: resolve
                    }
                ]
            }));
        });
    }

    static async confirm(nav: NavController, title: string, msg: string, buttonText?: { ok?: string, cancel?: string }): Promise<boolean> {
        let okButton = 'Ok';
        let cancelButton = 'Cancel';
        if (buttonText) {
            if (buttonText.ok) okButton = buttonText.ok;
            if (buttonText.cancel) cancelButton = buttonText.cancel;
        }
        return await new Promise<boolean>((resolve, reject) => {
            nav.present(Alert.create({
                title: title,
                message: msg,
                buttons: [
                    {
                        text: cancelButton,
                        role: 'cancel',
                        handler: () => resolve(false)
                    },
                    {
                        text: okButton,
                        handler: () => resolve(true)
                    }
                ]
            }));
        });
    }
}

export class Spinner {
    static async within<T>(nav: NavController, msg: string, proc: () => Promise<T>): Promise<T> {
        const loading = Loading.create({
            content: msg
        });
        nav.present(loading);
        try {
            return await proc();
        } finally {
            loading.dismiss();
        }
    }
}
