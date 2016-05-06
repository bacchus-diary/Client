export function assert(name: string, v) {
    if (v === undefined || v === null) {
        throw new ReferenceError(`${name} must be assigned: ${v}`);
    }
}
