import { Mutex, MutexInterface, Semaphore, SemaphoreInterface } from 'async-mutex';
import { BytesDict } from './math_helper';
export declare const BACKFILL_FEED = "triggerHomeTimelineBackFill()";
export declare const CLEANUP_FEED = "cleanupFeed()";
export declare const PREP_SCORERS = "prepareScorers()";
export declare const TRIGGER_FEED = "triggerFeedUpdate()";
export declare const logDebug: (pfx: string, msg: string, ...args: any[]) => void;
export declare const logInfo: (pfx: string, msg: string, ...args: any[]) => void;
export declare function lockExecution(locker: Mutex | Semaphore, logPrefix: string): Promise<MutexInterface.Releaser | SemaphoreInterface.Releaser>;
export declare function logAndThrowError(message: string, obj?: any): never;
export declare function logTelemetry(logPrefix: string, msg: string, startedAt: Date, ...args: any[]): void;
export declare function logTootRemoval(prefix: string, tootType: string, numRemoved: number, numTotal: number): void;
export declare function sizeOf(obj: any, sizes: BytesDict): number;
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
export declare class ComponentLogger {
    componentName: string;
    logPrefix: string;
    subtitle?: string;
    constructor(componentName: string, subtitle?: string);
    error(msg: string, ...args: any[]): void;
    warn(msg: string, ...args: any[]): void;
    log(msg: string, ...args: any[]): void;
    info(msg: string, ...args: any[]): void;
    debug(msg: string, ...args: any[]): void;
    trace(msg: string, ...args: any[]): void;
    private makeMsg;
}
