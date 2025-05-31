export declare class Logger {
    componentName: string;
    logPrefix: string;
    subtitle?: string;
    subsubtitle?: string;
    subsubsubtitle?: string;
    constructor(componentName: string, subtitle?: string, subsubtitle?: string, subsubsubtitle?: string);
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
}
