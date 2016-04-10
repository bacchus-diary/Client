
function padLeft(v: string, d: number, c?: string): string {
    if (v.length > d) return v;
    if (!c) c = ' ';
    return `${c.repeat(d)}${v}`.slice(-d);
}

function dateString(now?: Date): string {
    if (!now) now = new Date();
    const pad = (d: number) => (v: number) => padLeft(v.toString(), d, '0');
    const date = [
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
    ].map(pad(2)).join('-');
    const time = [
        now.getHours(),
        now.getMinutes(),
        now.getSeconds()
    ].map(pad(2)).join(':');
    return `${date} ${time}.${pad(3)(now.getMilliseconds())}`;
}

export type Lebel = "DEBUG" | "INFO" | "WARN" | "FATAL";

const lebels: Array<Lebel> = ["DEBUG", "INFO", "WARN", "FATAL"];

export class Logger {
    static lebel: Lebel = "DEBUG";
    static async setLebelByVersionNumber() {
        try {
            const version = await window.cordova.getAppVersion.getVersionNumber();
            console.log(`Checking version number: ${version}`);
            const last = _.last(version.match(/[0-9]/g));
            const v = parseInt(last);
            if (v % 2 == 0) {
                this.lebel = "INFO";
            } else {
                this.lebel = "DEBUG";
            }
        } catch (ex) {
            this.lebel = "DEBUG";
        }
        console.log(`Set log lebel: ${this.lebel}`);
    }

    constructor(private owner: any) {
        this.lebel = Logger.lebel;
    }

    lebel: Lebel;

    private checkLebel(l: Lebel): boolean {
        const limit = _.findIndex(lebels, this.lebel);
        const n = _.findIndex(lebels, l);
        return limit <= n;
    }

    private output(lebel: Lebel, msg: () => string) {
        if (this.checkLebel(lebel)) {
            const text = `${dateString()}: ${padLeft(lebel, 5)}: ${msg()}`;
            if (window.plugin && window.plugin.Fabric) {
                window.plugin.Fabric.Crashlytics.log(text);
            } else {
                console.log(text);
            }
        }
    }

    public debug(msg: () => string) {
        this.output("DEBUG", msg);
    }

    public info(msg: () => string) {
        this.output("INFO", msg);
    }

    public warn(msg: () => string) {
        this.output("WARN", msg);
    }

    public fatal(msg: () => string) {
        this.output("FATAL", msg);
    }
}
