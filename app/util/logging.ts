export class Logger {
    constructor(owner: any) { }

    public debug(msg: () => string) {
        console.log(msg());
    }

    public info(msg: () => string) {
        console.log(msg());
    }

    public warn(msg: () => string) {
        console.log(msg());
    }

    public fatal(msg: () => string) {
        console.log(msg());
    }
}
