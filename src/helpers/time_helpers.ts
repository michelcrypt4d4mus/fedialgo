/*
 * Helpers for time-related operations
 */
import { Config, DEFAULT_LOCALE, SECONDS_IN_HOUR } from "../config";
import { NULL, quoted} from "./string_helpers";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const PARSEABLE_DATE_TYPES = ["string", "number"];
const SECONDS_IN_DAY = 24 * SECONDS_IN_HOUR;
const SECONDS_IN_WEEK = 7 * SECONDS_IN_DAY;


// Compute the difference from 'date' to now in seconds.
// Accepts ISO format strings, millisecond timestamps, and Date objects.
export function ageInSeconds(date: Date | number | string | null): number {
    if (date == null) {
        console.warn("Invalid date passed to ageInSeconds():", date);
        return -1;
    }

    let _date = PARSEABLE_DATE_TYPES.includes(typeof date) ? new Date(date) : date as Date;
    return (Date.now() - _date.getTime()) / 1000;
};


// Compute the difference from 'date' to now in minutes
export function ageInMinutes(date: Date | number | string | null): number {
    return ageInSeconds(date) / 60.0;
};


// Make a nice string like "in 2.5 minutes"
export function ageString(date: Date | number | string | null): string {
    if (date == null) return NULL;
    const seconds = ageInSeconds(date);
    const secondsStr = seconds < 0.1 ? seconds.toFixed(3) : seconds.toFixed(1);
    return `in ${secondsStr} seconds`;
};


export function mostRecent(...args: (Date | null)[]): Date | null {
    let mostRecentDate: Date | null = null;

    for (const arg of args) {
        if (arg == null) continue;

        if (mostRecentDate == null || arg > mostRecentDate) {
            mostRecentDate = arg;
        }
    }

    return mostRecentDate;
};


// To the format YYYY-MM-DDTHH:MM:SSZ
export function toISOFormat(date: Date | string | null | undefined, withMilliseconds?: boolean): string {
    let isoString: string;

    if (!date) {
        return NULL;
    } else if (typeof date === "string") {
        isoString = new Date(date).toISOString();
    } else {
        isoString = date.toISOString();
    }

    return withMilliseconds ? isoString : isoString.replace(/\.\d+/, "");
};


// toISOFormat() but with quotes around it.
export function quotedISOFmt(date: Date | string | null, withMilliseconds?: boolean): string {
    if (date == null) return NULL;
    return quoted(toISOFormat(date, withMilliseconds));
};


// Generate a string representing a timestamp.
export const timeString = (_timestamp: Date | string | null, locale?: string): string => {
    if (_timestamp == null) return NULL;
    locale ||= DEFAULT_LOCALE;
    const timestamp = (typeof _timestamp == 'string') ? new Date(_timestamp) : _timestamp;
    let str: string;

    if (ageInSeconds(timestamp) < (SECONDS_IN_DAY * 6)) {
        str = (timestamp.getDate() == new Date().getDate()) ? "today" : DAY_NAMES[timestamp.getDay()];
    } else {
        str = timestamp.toLocaleDateString(locale);
    }

    str += ` ${timestamp.toLocaleTimeString(locale)}`;
    // console.debug(`timeString() converted ${_timestamp} to ${str} w/locale "${locale}" (toLocaleString() gives "${timestamp.toLocaleString()}")`);
    return str;
};


// Timestamp string for the current time
export function nowString(): string {
    const now = new Date();
    return `${now.toLocaleDateString()} ${now.toLocaleTimeString().split(".")[0]}`;
};


// Return the oldest timestamp we should feed timeline toots until
export function timelineCutoffAt(): Date {
    const timelineLookBackMS = Config.maxTimelineDaysToFetch * SECONDS_IN_DAY * 1000;
    return subtractSeconds(new Date(), timelineLookBackMS);
};


// Subtract 'seconds' from 'date' and return the new Date
export function subtractSeconds(date: Date, seconds: number): Date {
    return new Date(date.getTime() - (seconds * 1000));
};
