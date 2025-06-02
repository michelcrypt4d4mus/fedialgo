export declare class Logger {
    logPrefix: string;
    prefixes: string[];
    constructor(name: string, ...args: string[]);
    static withParenthesizedName(name: string, parenthesized: string, ...args: string[]): Logger;
    error(msg: string | Error, ...args: any[]): string;
    warn: (msg: string, ...args: any[]) => void;
    log: (msg: string, ...args: any[]) => void;
    info: (msg: string, ...args: any[]) => void;
    debug: (msg: string, ...args: any[]) => void;
    trace: (msg: string, ...args: any[]) => void;
    logAndThrowError(msg: string, ...args: any[]): never;
    logArrayReduction<T>(before: T[], after: T[], objType: string, reason?: string): void;
    logTelemetry(msg: string, startedAt: Date, ...args: any[]): void;
    tempLogger(prefix: string): Logger;
    tagWithRandomString(): void;
    private errorStr;
    private makeErrorMsg;
    private str;
    static logBuilder(name: string, ...prefixes: string[]): ((...args: string[]) => Logger);
}
