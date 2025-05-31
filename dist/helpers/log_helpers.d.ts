import { Mutex, Semaphore } from 'async-mutex';
import { Logger } from './logger';
import { type ConcurrencyLockRelease } from '../types';
export declare const BACKFILL_FEED = "triggerHomeTimelineBackFill()";
export declare const PREP_SCORERS = "prepareScorers()";
export declare const TRIGGER_FEED = "triggerFeedUpdate()";
export declare function lockExecution(locker: Mutex | Semaphore, logger: Logger, logPrefix?: string): Promise<ConcurrencyLockRelease>;
export declare function logAndThrowError(message: string, obj?: any): never;
export declare function logTootRemoval(logger: Logger, tootType: string, numRemoved: number, numTotal: number): void;
export declare function traceLog(msg: string, ...args: any[]): void;
export declare const strBytes: (str: string) => number;
export declare class WaitTime {
    avgMsPerRequest: number;
    milliseconds: number;
    numRequests: number;
    startedAt: Date;
    ageString(): string;
    markStart(): void;
    markEnd(): void;
    toDict(): Record<string, number>;
}
