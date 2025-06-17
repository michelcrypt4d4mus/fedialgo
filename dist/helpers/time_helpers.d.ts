import { type OptionalString } from "../types";
type DateArg = Date | OptionalString | number;
export declare const ageInHours: (date: DateArg, endTime?: DateArg) => number;
export declare const ageInMinutes: (date: DateArg, endTime?: DateArg) => number;
export declare const ageInSeconds: (date: DateArg, endTime?: DateArg) => number;
export declare function ageInMS(date: DateArg, endTime?: DateArg): number;
/**
 * Make a nice string like "in 2.5 minutes"
 * @param {DateArg} date - The date to calculate the age from.
 * @returns {string} A string representing the age in seconds, formatted to 1 decimal place.
 */
export declare function ageString(date: DateArg): string;
/**
 * Coerce a string or number into a Date object.
 * @param {DateArg} date - The date to coerce.
 * @returns {Date|null} A Date object if coercion is successful, or null if the input is invalid.
 */
export declare function coerceDate(date: DateArg): Date | null;
export declare function mostRecent(...args: (Date | null)[]): Date | null;
export declare function nowString(): string;
export declare function quotedISOFmt(date: DateArg, withMilliseconds?: boolean): string;
export declare function sleep(milliseconds: number): Promise<void>;
export declare function subtractSeconds(date: Date, seconds: number): Date;
export declare function timelineCutoffAt(): Date;
export declare const timeString: (_timestamp: DateArg, locale?: string) => string;
export declare function toISOFormat(date: DateArg, withMilliseconds?: boolean): string;
export declare function toISOFormatIfExists(date: DateArg, withMilliseconds?: boolean): string | null;
export {};
