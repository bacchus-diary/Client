
export declare type PluginCallback<T> = (err, result: T) => void;

export interface FBConnectPlugin {
    login(callback: PluginCallback<string>, arg?: string): void;
    logout(callback: PluginCallback<void>): void;
    getName(callback: PluginCallback<string>): void;
    getToken(callback: PluginCallback<string>): void;
}
