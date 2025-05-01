export declare const SECONDS_IN_MINUTE = 60;
export declare const SECONDS_IN_HOUR = 3600;
export declare const SECONDS_IN_DAY = 86400;
export declare function ageInSeconds(date: Date | number | string): number;
export declare function toISOFormat(date: Date | string | null | undefined, withMilliseconds?: boolean): string;
export declare function quotedISOFmt(date: Date | string | null, withMilliseconds?: boolean): string;
export declare const timeString: (_timestamp: Date | string | null, locale?: string) => string;
