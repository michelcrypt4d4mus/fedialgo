type LoggerArg = string | boolean | null | undefined;
export declare class Logger {
    logPrefix: string;
    prefixes: string[];
    constructor(name: string, ...args: LoggerArg[]);
    static withParenthesizedName(name: string, parenthesized: string, ...args: string[]): Logger;
    error(msg: string | Error, ...args: any[]): string;
    warn: (msg: string, ...args: any[]) => void;
    log: (msg: string, ...args: any[]) => void;
    info: (msg: string, ...args: any[]) => void;
    debug: (msg: string, ...args: any[]) => void;
    trace: (msg: string, ...args: any[]) => void;
    deep: (msg: string, ...args: any[]) => void;
    warnWithoutTrace: (msg: string, ...args: any[]) => void;
    line(msg: string | undefined): string;
    logAndThrowError(msg: string, ...args: any[]): never;
    logArrayReduction<T>(before: T[], after: T[], objType: string, reason?: string): void;
    logTelemetry(msg: string, startedAt: Date, ...args: any[]): void;
    tagWithRandomString(): void;
    tempLogger(arg1: string, ...args: LoggerArg[]): Logger;
    private errorStr;
    private makeErrorMsg;
    static logBuilder(name: string, ...prefixes: LoggerArg[]): ((...args: LoggerArg[]) => Logger);
}
export {};
