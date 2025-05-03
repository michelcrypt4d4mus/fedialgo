import { Mutex, MutexInterface, Semaphore, SemaphoreInterface } from 'async-mutex';
export declare const logInfo: (prefix: string, msg: string, ...args: any[]) => void;
export declare const logDebug: (prefix: string, msg: string, ...args: any[]) => void;
export declare function logTootRemoval(prefix: string, tootType: string, numRemoved: number, numTotal: number): void;
export declare function logAndThrowError(message: string, obj?: any): never;
export declare function lockMutex(mutex: Mutex, logPrefix: string): Promise<MutexInterface.Releaser>;
export declare function lockSemaphore(semaphore: Semaphore, logPrefix: string): Promise<[number, SemaphoreInterface.Releaser]>;
export declare function traceLog(msg: string, ...args: any[]): void;
export declare function addPrefix(prefix: string, msg: string): string;
