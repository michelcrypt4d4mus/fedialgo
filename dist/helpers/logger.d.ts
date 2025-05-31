export declare class Logger {
    logPrefix: string;
    prefixes: string[];
    constructor(componentName: string, ...args: string[]);
    error(msg: string | Error, ...args: any[]): string;
    warn(msg: string, ...args: any[]): void;
    log(msg: string, ...args: any[]): void;
    logTelemetry(msg: string, startedAt: Date, ...args: any[]): void;
    info(msg: string, ...args: any[]): void;
    debug(msg: string, ...args: any[]): void;
    trace(msg: string, ...args: any[]): void;
    tempLogger(prefix: string): Logger;
    tagWithRandomString(): void;
    private getErrorMessage;
    private makeErrorMsg;
    private makeMsg;
    static logBuilder(componentName: string, ...prefixes: string[]): ((...args: string[]) => Logger);
}
