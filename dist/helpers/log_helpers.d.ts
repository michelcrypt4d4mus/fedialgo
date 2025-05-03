export declare const logInfo: (prefix: string, msg: string, ...args: any[]) => void;
export declare const logDebug: (prefix: string, msg: string, ...args: any[]) => void;
export declare function logTootRemoval(prefix: string, tootType: string, numRemoved: number, numTotal: number): void;
export declare function logAndThrowError(message: string, obj?: any): never;
export declare function checkMutexWaitTime(waitStartedAt: Date, logPrefix: string): void;
