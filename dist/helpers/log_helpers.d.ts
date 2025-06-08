import { Mutex, Semaphore } from 'async-mutex';
import { Logger } from './logger';
import { type ConcurrencyLockRelease } from '../types';
export declare const BACKFILL_FEED = "triggerHomeTimelineBackFill";
export declare const PREP_SCORERS = "prepareScorers";
export declare const TRIGGER_FEED = "triggerFeedUpdate";
export declare function lockExecution(locker: Mutex | Semaphore, logger: Logger): Promise<ConcurrencyLockRelease>;
export declare const strBytes: (str: string) => number;
export declare function traceLog(msg: string, ...args: any[]): void;
export declare class WaitTime {
    avgMsPerRequest: number;
    logger: Logger;
    milliseconds: number;
    numRequests: number;
    startedAt: Date;
    ageInSeconds(): number;
    ageString(): string;
    markStart(): void;
    markEnd(): void;
    toDict(): Record<string, number>;
}
