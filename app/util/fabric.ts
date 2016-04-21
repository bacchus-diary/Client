import {Logger} from './logging';

const logger = new Logger('withFabric');

export function withFabric(proc: (f: Fabric) => any): void {
    try {
        if (typeof plugin !== 'undefined' && plugin.Fabric) {
            proc(plugin.Fabric);
        }
    } catch (ex) {
        logger.warn(() => `Error on Fabric: ${ex}`);
    }
}
