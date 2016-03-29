function assert(name: string, v) {
    if (v == undefined && v == null) {
        throw `${name} must be assigned: ${v}`;
    }
}
