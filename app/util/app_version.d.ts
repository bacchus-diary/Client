
interface Cordova {
    getAppVersion: AppVersion;
}

interface AppVersion {
    getAppName(): Promise<string>;
    getPackageName(): Promise<string>;
    getVersionCode(): Promise<string>;
    getVersionNumber(): Promise<string>;
}
