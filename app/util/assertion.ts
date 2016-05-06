export function assert(name: string, v) {
    if (v === undefined || _.isNil(v)) {
        throw new ReferenceError(`${name} must be assigned: ${v}`);
    }
}
