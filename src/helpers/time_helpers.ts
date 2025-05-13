/*
 * Helpers for time-related operations
 */
import { Config, SECONDS_IN_DAY } from "../config";
import { NULL, quoted} from "./string_helpers";

type DateArg = Date | number | string | null | undefined;

// TODO: use the formatting functions, don't do date lookup manually
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const PARSEABLE_DATE_TYPES = ["string", "number"];


// Compute the difference from 'date' to now in minutes
export const ageInHours = (date: DateArg, endTime?: DateArg) => ageInMinutes(date, endTime) / 60.0;
export const ageInMinutes = (date: DateArg, endTime?: DateArg) => ageInSeconds(date, endTime) / 60.0;

// Compute the difference from 'date' to now in seconds.
// Accepts ISO format strings, millisecond timestamps, and Date objects.
export function ageInSeconds(date: DateArg, endTime?: DateArg): number {
    if (!date) {
        console.warn("Invalid date passed to ageInSeconds():", date);
        return -1;
    }

    endTime = coerceDate(endTime || new Date());
    return (endTime!.getTime() - coerceDate(date)!.getTime()) / 1000;
};


// Make a nice string like "in 2.5 minutes"
export function ageString(date: DateArg): string {
    if (!date) return NULL;
    const seconds = ageInSeconds(date);
    const secondsStr = seconds < 0.1 ? seconds.toFixed(3) : seconds.toFixed(1);
    return `in ${secondsStr} seconds`;
};


// Coerce a string or number into a Date object.
export function coerceDate(date: DateArg): Date | null {
    if (!date) return null;
    return (PARSEABLE_DATE_TYPES.includes(typeof date) ? new Date(date) : date) as Date;
};


// Recent the most recent of a list of dates
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


// Timestamp string for the current time
export function nowString(): string {
    const now = new Date();
    return `${now.toLocaleDateString()} ${now.toLocaleTimeString().split(".")[0]}`;
};


// toISOFormat() but with quotes around it.
export function quotedISOFmt(date: DateArg, withMilliseconds?: boolean): string {
    if (date == null) return NULL;
    return quoted(toISOFormat(date, withMilliseconds));
};


// Sleep helper
export async function sleep(seconds: number): Promise<void> {
    await new Promise(r => setTimeout(r, seconds * 1000));
};


// Subtract 'seconds' from 'date' and return the new Date
export function subtractSeconds(date: Date, seconds: number): Date {
    return new Date(date.getTime() - (seconds * 1000));
};


// Generate a string representing a timestamp.
// (new Date()).toLocaleDateString('en-us', { weekday: "long", year: "numeric", month: "short", day: "numeric"})
//    => 'Thursday, Sep 1, 2022'
export const timeString = (_timestamp: DateArg, locale?: string): string => {
    if (!_timestamp) return NULL;
    locale ||= Config.locale;;
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


// Return the oldest timestamp we should feed timeline toots until
export function timelineCutoffAt(): Date {
    const timelineLookBackMS = Config.maxTimelineDaysToFetch * SECONDS_IN_DAY * 1000;
    return subtractSeconds(new Date(), timelineLookBackMS);
};


// To the format YYYY-MM-DDTHH:MM:SSZ
export function toISOFormat(date: DateArg, withMilliseconds?: boolean): string {
    if (!date) return NULL;

    const isoString = coerceDate(date)!.toISOString();
    return withMilliseconds ? isoString : isoString.replace(/\.\d+/, "");
};
