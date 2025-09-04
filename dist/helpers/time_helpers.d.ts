/**
 * Helpers for time-related operations
 * @module time_helpers
 */
import { type Optional, type OptionalString } from "../types";
type DateArg = Date | OptionalString | number;
/** Helper class for computing age differences in various units. */
export declare class AgeIn {
    /**
     * Milliseconds of difference between a given time and either now or an optional end time.
     * @param {DateArg} startTime - The time to calculate the age from.
     * @param {DateArg} [endTime] - Optional end time to calculate the age to (defaults to now)
     * @returns {number} The age in milliseconds, or -1 if the start time is invalid.
     */
    static ms(startTime: DateArg, endTime?: DateArg): number;
    /**
     * Hours of difference between a given time and either now or an optional end time.
     * @param {DateArg} startTime - The time to calculate the age from.
     * @param {DateArg} [endTime] - Optional end time to calculate the age to (defaults to now)
     * @returns {number} The age in hours, or a negative number if the start time is invalid.
     */
    static hours(startTime: DateArg, endTime?: DateArg): number;
    /**
     * Minutes of difference between a given time and either now or an optional end time.
     * @param {DateArg} startTime - The time to calculate the age from.
     * @param {DateArg} [endTime] - Optional end time to calculate the age to (defaults to now)
     * @returns {number} The age in milliseconds, or a negative number if the start time is invalid.
     */
    static minutes(startTime: DateArg, endTime?: DateArg): number;
    /**
     * Seconds of difference between a given time and either now or an optional end time.
     * @param {DateArg} startTime - The time to calculate the age from.
     * @param {DateArg} [endTime] - Optional end time to calculate the age to (defaults to now)
     * @returns {number} The age in seconds, or a negative number if the start time is invalid.
     */
    static seconds(startTime: DateArg, endTime?: DateArg): number;
}
/**
 * Make a nice string like "in 2.5 minutes" representing time from a date to now.
 * @param {DateArg} date - The date to calculate the age from.
 * @returns {string} A string representing the age in seconds, formatted to 1 decimal place.
 */
export declare function ageString(date: DateArg): string;
/**
 * Coerce a string or number into a Date object.
 * @param {DateArg} date - The date to coerce.
 * @returns {Optional<Date>} A Date object if coercion is successful, or null if the input is invalid.
 */
export declare function coerceDate(date: DateArg): Optional<Date>;
/**
 * Returns the most recent (latest) date from a list of Date or null values.
 * @param {...DateArg[]} args - Dates to compare.
 * @returns {Optional<Date>} The most recent date, or null if none are valid.
 */
export declare function mostRecent(...args: DateArg[]): Optional<Date>;
/**
 * String for the current time in local datetime format, e.g. ""17/06/2025 17:59:58""
 * @returns {string} Localized current date and time string
 */
export declare function nowString(): string;
/**
 * Returns the ISO format of a date, wrapped in quotes.
 * @param {DateArg} date - The date to format.
 * @param {boolean} [withMilliseconds] - Whether to include milliseconds in the output.
 * @returns {string} The quoted ISO format string, or the string "NULL" if date is null.
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
 * Generate a string representing a timestamp.
 * (new Date()).toLocaleDateString('en-us', { weekday: "long", year: "numeric", month: "short", day: "numeric"})
 *     => 'Thursday, Sep 1, 2022'
 * @param {DateArg} _timestamp - The timestamp to convert to a string.
 * @param {string} [locale] - Optional locale string for formatting the date.
 * @returns {string} A formatted string representing the timestamp, or NULL if the timestamp is invalid.
 */
export declare const timeString: (_timestamp: DateArg, locale?: string) => string;
/**
 * Returns the oldest timestamp to use as a cutoff for timeline toots, based on config settings.
 * @returns {Date} The cutoff date for timeline toots.
 */
export declare function timelineCutoffAt(): Date;
/**
 * Date to the format YYYY-MM-DDTHH:MM:SSZ
 * @param {DateArg} date - The date to convert to ISO format.
 * @param {boolean} [withMilliseconds=false] - If true, includes milliseconds in the output.
 * @returns {string} The date in ISO format.
 */
export declare function toISOFormat(date: DateArg, withMilliseconds?: boolean): string;
/**
 * Like toISOFormat() but returns null if the date is undefined or null.
 * @param {DateArg} date - The date to convert to ISO format.
 * @param {boolean} [withMilliseconds=false] - If true, includes milliseconds in the output.
 * @returns {string} The date in ISO format, or NULL if the date is invalid.
 */
export declare function toISOFormatIfExists(date: DateArg, withMilliseconds?: boolean): string | null;
/** Helper class for telemetry. */
export declare class WaitTime {
    avgMsPerRequest: number;
    milliseconds: number;
    numRequests: number;
    startedAt: Date;
    ageInSeconds(): number;
    ageString(): string;
    markStart(): void;
    markEnd(): void;
}
export {};
