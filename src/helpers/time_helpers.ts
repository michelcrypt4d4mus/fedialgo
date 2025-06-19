/**
 * Helpers for time-related operations
 * @module time_helpers
 */

import { isNil } from "lodash";

import { config, SECONDS_IN_DAY } from "../config";
import { NULL, quoted } from "./string_helpers";
import { type Optional, type OptionalString } from "../types";

type DateArg = Date | OptionalString | number;

// TODO: use the formatting functions, don't do date lookup manually
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
const PARSEABLE_DATE_TYPES = new Set(["string", "number"]);


// Compute the difference from 'date' to now in minutes
export const ageInHours = (date: DateArg, endTime?: DateArg) => ageInMinutes(date, endTime) / 60.0;
export const ageInMinutes = (date: DateArg, endTime?: DateArg) => ageInSeconds(date, endTime) / 60.0;
export const ageInSeconds = (date: DateArg, endTime?: DateArg) => ageInMS(date, endTime) / 1000.0;


/**
 * Compute the age in milliseconds from a date to now or an optional end time.
 * @param {DateArg} startTime - The time to calculate the age from.
 * @param {DateArg} [endTime] - Optional end time to calculate the age to (defaults to now)
 * @returns {number} The age in milliseconds, or -1 if the start time is invalid.
 */
export function ageInMS(startTime: DateArg, endTime?: DateArg): number {
    if (!startTime) {
        console.warn("Invalid date passed to ageInSeconds():", startTime);
        return -1;
    }

    endTime = coerceDate(endTime || new Date());
    return endTime!.getTime() - coerceDate(startTime)!.getTime();
};


/**
 * Make a nice string like "in 2.5 minutes" representing time from a date to now.
 * @param {DateArg} date - The date to calculate the age from.
 * @returns {string} A string representing the age in seconds, formatted to 1 decimal place.
 */
export function ageString(date: DateArg): string {
    if (!date) return NULL;
    const seconds = ageInSeconds(date);
    const secondsStr = seconds < 0.1 ? seconds.toFixed(3) : seconds.toFixed(1);
    return `in ${secondsStr} seconds`;
};


/**
 * Coerce a string or number into a Date object.
 * @param {DateArg} date - The date to coerce.
 * @returns {Optional<Date>} A Date object if coercion is successful, or null if the input is invalid.
 */
export function coerceDate(date: DateArg): Optional<Date> {
    if (!date) return null;
    return (PARSEABLE_DATE_TYPES.has(typeof date) ? new Date(date) : date) as Date;
};


/**
 * Returns the most recent (latest) date from a list of Date or null values.
 * @param {...DateArg[]} args - Dates to compare.
 * @returns {Optional<Date>} The most recent date, or null if none are valid.
 */
export function mostRecent(...args: DateArg[]): Optional<Date> {
    let mostRecentDate: Optional<Date> = null;
    const coercedArgs = args.filter(a => !isNil(a)).map(arg => coerceDate(arg)) as Date[]

    for (const arg of coercedArgs) {
        if (isNil(mostRecentDate) || arg > mostRecentDate) {
            mostRecentDate = arg;
        }
    }

    return mostRecentDate;
};


/**
 * String for the current time in local datetime format, e.g. ""17/06/2025 17:59:58""
 * @returns {string} Localized current date and time string
 */
export function nowString(): string {
    const now = new Date();
    return `${now.toLocaleDateString()} ${now.toLocaleTimeString().split(".")[0]}`;
};


/**
 * Returns the ISO format of a date, wrapped in quotes.
 * @param {DateArg} date - The date to format.
 * @param {boolean} [withMilliseconds] - Whether to include milliseconds in the output.
 * @returns {string} The quoted ISO format string, or NULL if date is null.
 */
export function quotedISOFmt(date: DateArg, withMilliseconds?: boolean): string {
    return date ? quoted(toISOFormat(date, withMilliseconds)) : NULL;
};


/**
 * Asynchronous sleep helper that pauses execution for the specified number of milliseconds.
 * @param {number} milliseconds - The number of milliseconds to sleep.
 * @returns {Promise<void>} A promise that resolves after the specified time.
 */
export async function sleep(milliseconds: number): Promise<void> {
    await new Promise(r => setTimeout(r, milliseconds));
};


/**
 * Subtracts a number of seconds from a date and returns the new Date.
 * @param {Date} date - The original date.
 * @param {number} seconds - The number of seconds to subtract.
 * @returns {Date} The new date with seconds subtracted.
 */
export function subtractSeconds(date: Date, seconds: number): Date {
    return new Date(date.getTime() - (seconds * 1000));
};


/**
 * Generate a string representing a timestamp.
 * (new Date()).toLocaleDateString('en-us', { weekday: "long", year: "numeric", month: "short", day: "numeric"})
 *     => 'Thursday, Sep 1, 2022'
 * @param {DateArg} _timestamp - The timestamp to convert to a string.
 * @param {string} [locale] - Optional locale string for formatting the date.
 * @returns {string} A formatted string representing the timestamp, or NULL if the timestamp is invalid.
 */
export const timeString = (_timestamp: DateArg, locale?: string): string => {
    if (!_timestamp) return NULL;
    locale ||= config.locale.locale;;
    const timestamp = coerceDate(_timestamp);
    const isToday = timestamp!.getDate() == new Date().getDate();
    const seconds = ageInSeconds(timestamp);
    let str: string;

    if (isToday) {
        str = "today";
    } else if (seconds < 0 && seconds > (-1 * 7 * SECONDS_IN_DAY)) {
        str = `this coming ${DAY_NAMES[timestamp!.getDay()]}`;
    } else if (seconds < (SECONDS_IN_DAY * 6)) {
        str = DAY_NAMES[timestamp!.getDay()];
    } else {
        str = timestamp!.toLocaleDateString(locale);
    }

    str += ` ${timestamp!.toLocaleTimeString(locale)}`;
    // console.debug(`timeString() converted ${_timestamp} to ${str} w/locale "${locale}" (toLocaleString() gives "${timestamp.toLocaleString()}")`);
    return str;
};


/**
 * Returns the oldest timestamp to use as a cutoff for timeline toots, based on config settings.
 * @returns {Date} The cutoff date for timeline toots.
 */
export function timelineCutoffAt(): Date {
    const timelineLookBackMS = config.toots.maxAgeInDays * SECONDS_IN_DAY * 1000;
    return subtractSeconds(new Date(), timelineLookBackMS);
};


/**
 * Date to the format YYYY-MM-DDTHH:MM:SSZ
 * @param {DateArg} date - The date to convert to ISO format.
 * @param {boolean} [withMilliseconds=false] - If true, includes milliseconds in the output.
 * @returns {string} The date in ISO format, or NULL if the date is invalid.
 */
export function toISOFormat(date: DateArg, withMilliseconds?: boolean): string {
    if (!date) return NULL;
    const isoString = coerceDate(date)!.toISOString();
    return withMilliseconds ? isoString : isoString.replace(/\.\d+/, "");
};


/** Like toISOFormat() but returns null if the date is undefined or null. */
export function toISOFormatIfExists(date: DateArg, withMilliseconds?: boolean): string | null {
    return date ? toISOFormat(date, withMilliseconds) : null;
};


/** Helper class for telemetry.  */
export class WaitTime {
    avgMsPerRequest: number = 0;
    milliseconds: number = 0;
    numRequests: number = 0;
    startedAt: Date = new Date(); // TODO: this shouldn't really be set yet...

    ageInSeconds(): number {
        return ageInSeconds(this.startedAt);
    }

    ageString(): string {
        return ageString(this.startedAt);
    }

    markStart(): void {
        this.startedAt = new Date();
    }

    markEnd(): void {
        this.numRequests++;
        this.milliseconds += ageInMS(this.startedAt);
        this.avgMsPerRequest = this.milliseconds / this.numRequests;
    }
};
