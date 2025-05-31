export declare class ComponentLogger {
    componentName: string;
    logPrefix: string;
    subtitle?: string;
    subsubtitle?: string;
    constructor(componentName: string, subtitle?: string, subsubtitle?: string);
    error(msg: string | Error, ...args: any[]): string;
    warn(msg: string, ...args: any[]): void;
    log(msg: string, ...args: any[]): void;
    info(msg: string, ...args: any[]): void;
    debug(msg: string, ...args: any[]): void;
    trace(msg: string, ...args: any[]): void;
    tagWithRandomString(): void;
    private getErrorMessage;
    private makeErrorMsg;
    private makeMsg;
}
