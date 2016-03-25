
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

type Lebel = "DEBUG" | "INFO" | "WARN" | "FATAL";

export class Logger {
    constructor(private owner: any) { }

    private output(lebel: Lebel, msg: string) {
        console.log(`${dateString()}: ${padLeft(lebel, 5)}: ${msg}`);
    }

    public debug(msg: () => string) {
        this.output("DEBUG", msg());
    }

    public info(msg: () => string) {
        this.output("INFO", msg());
    }

    public warn(msg: () => string) {
        this.output("WARN", msg());
    }

    public fatal(msg: () => string) {
        this.output("FATAL", msg());
    }
}
