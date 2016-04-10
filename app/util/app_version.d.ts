
interface Cordova {
    getAppVersion: AppVersion;
}

declare var cordova: Cordova;

interface AppVersion {
    getAppName(): Promise<string>;
    getPackageName(): Promise<string>;
    getVersionCode(): Promise<string>;
    getVersionNumber(): Promise<string>;
}
