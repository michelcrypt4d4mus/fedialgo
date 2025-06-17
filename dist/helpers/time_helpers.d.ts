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
/**
 * Returns the most recent (latest) date from a list of Date or null values.
 * @param {...(Date | null)} args - Dates to compare.
 * @returns {Date | null} The most recent date, or null if none are valid.
 */
export declare function mostRecent(...args: (Date | null)[]): Date | null;
/**
 * Returns a timestamp string for the current time in local date and time format.
 * @returns {string} The current date and time as a string.
 */
export declare function nowString(): string;
/**
 * Returns the ISO format of a date, wrapped in quotes.
 * @param {DateArg} date - The date to format.
 * @param {boolean} [withMilliseconds] - Whether to include milliseconds in the output.
 * @returns {string} The quoted ISO format string, or NULL if date is null.
 */
export declare function quotedISOFmt(date: DateArg, withMilliseconds?: boolean): string;
/**
 * Asynchronous sleep helper that pauses execution for the specified number of milliseconds.
 * @param {number} milliseconds - The number of milliseconds to sleep.
 * @returns {Promise<void>} A promise that resolves after the specified time.
 */
export declare function sleep(milliseconds: number): Promise<void>;
/**
 * Subtracts a number of seconds from a date and returns the new Date.
 * @param {Date} date - The original date.
 * @param {number} seconds - The number of seconds to subtract.
 * @returns {Date} The new date with seconds subtracted.
 */
export declare function subtractSeconds(date: Date, seconds: number): Date;
/**
 * Returns the oldest timestamp to use as a cutoff for timeline toots, based on config settings.
 * @returns {Date} The cutoff date for timeline toots.
 */
export declare function timelineCutoffAt(): Date;
/**
 * Generate a string representing a timestamp.
 * (new Date()).toLocaleDateString('en-us', { weekday: "long", year: "numeric", month: "short", day: "numeric"})
 *     => 'Thursday, Sep 1, 2022'
 * @param {DateArg} _timestamp - The timestamp to convert to a string.
 * @param {string} [locale] - Optional locale string for formatting the date.
 * @returns {string} A formatted string representing the timestamp, or NULL if the timestamp is invalid.
 */
export declare const timeString: (_timestamp: DateArg, locale?: string) => string;
/**
 * Date to the format YYYY-MM-DDTHH:MM:SSZ
 * @param {DateArg} date - The date to convert to ISO format.
 * @param {boolean} [withMilliseconds=false] - If true, includes milliseconds in the output.
 * @returns {string} The date in ISO format, or NULL if the date is invalid.
 */
export declare function toISOFormat(date: DateArg, withMilliseconds?: boolean): string;
/** Like toISOFormat() but returns null if the date is undefined or null. */
export declare function toISOFormatIfExists(date: DateArg, withMilliseconds?: boolean): string | null;
export {};
