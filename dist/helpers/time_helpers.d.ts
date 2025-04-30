export declare const SECONDS_IN_MINUTE = 60;
export declare const SECONDS_IN_HOUR = 3600;
export declare const SECONDS_IN_DAY = 86400;
export declare function ageInSeconds(date: Date | string): number;
export declare function ageOfTimestampInSeconds(timestamp: number): number;
export declare function toISOFormat(date: Date | string | null | undefined, withMilliseconds?: boolean): string;
