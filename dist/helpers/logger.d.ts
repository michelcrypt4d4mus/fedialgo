export declare class Logger {
    logPrefix: string;
    prefixes: string[];
    constructor(name: string, ...args: string[]);
    static withParenthesizedName(name: string, parenthesized: string, ...args: string[]): Logger;
    error(msg: string | Error, ...args: any[]): string;
    warn: (s: string, ...args: any[]) => void;
    log: (s: string, ...args: any[]) => void;
    info: (s: string, ...args: any[]) => void;
    debug: (s: string, ...args: any[]) => void;
    trace: (s: string, ...args: any[]) => void;
    logAndThrowError(message: string, ...args: any[]): never;
    logArrayReduction<T>(before: T[], after: T[], objType: string, reason?: string): void;
    logTelemetry(msg: string, startedAt: Date, ...args: any[]): void;
    tempLogger(prefix: string): Logger;
    tagWithRandomString(): void;
    private errorStr;
    private makeErrorMsg;
    private str;
    static logBuilder(name: string, ...prefixes: string[]): ((...args: string[]) => Logger);
}
