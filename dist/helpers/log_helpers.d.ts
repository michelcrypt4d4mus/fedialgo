import { Mutex, MutexInterface, Semaphore, SemaphoreInterface } from 'async-mutex';
export declare const BACKFILL_FEED = "triggerHomeTimelineBackFill()";
export declare const PREP_SCORERS = "prepareScorers()";
export declare const TRIGGER_FEED = "triggerFeedUpdate()";
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
export declare function lockExecution(locker: Mutex | Semaphore, logPrefix: string): Promise<MutexInterface.Releaser | SemaphoreInterface.Releaser>;
export declare function logAndThrowError(message: string, obj?: any): never;
export declare function logTelemetry(logPrefix: string, msg: string, startedAt: Date, ...args: any[]): void;
export declare function logTootRemoval(prefix: string, tootType: string, numRemoved: number, numTotal: number): void;
export declare function traceLog(msg: string, ...args: any[]): void;
export declare const strBytes: (str: string) => number;
export declare class WaitTime {
    avgMsPerRequest: number;
    milliseconds: number;
    numRequests: number;
    startedAt: Date;
    markStart(): void;
    markEnd(): void;
    toDict(): Record<string, number>;
}
