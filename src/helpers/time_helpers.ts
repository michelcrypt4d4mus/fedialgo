/*
 * Helpers for time-related operations
 */
import { NULL, quote} from "./string_helpers";

export const SECONDS_IN_MINUTE = 60;
export const SECONDS_IN_HOUR = 3600;
export const SECONDS_IN_DAY = 86400;
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const PARSEABLE_DATE_TYPES = ["string", "number"];
const DEFAULT_LOCALE = "en-US";

// Compute the difference from 'date' to now in seconds.
// Accepts ISO format strings, millisecond timestamps, and Date objects.
export function ageInSeconds(date: Date | number | string): number {
    if (!date) {
        console.warn("Invalid date passed to ageInSeconds:", date);
        return -1;
    }

    let _date = PARSEABLE_DATE_TYPES.includes(typeof date) ? new Date(date) : date as Date;
    return (Date.now() - _date.getTime()) / 1000;
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
    return quote(toISOFormat(date, withMilliseconds));
};


// Generate a string representing a timestamp.
export const timeString = (_timestamp: Date | string | null, locale?: string): string => {
    if (_timestamp == null) return NULL;
    locale ||= DEFAULT_LOCALE;
    const timestamp = (typeof _timestamp == 'string') ? new Date(_timestamp) : _timestamp;
    let str = (timestamp.getDate() == new Date().getDate()) ? "today" : DAY_NAMES[timestamp.getDay()];
    str += ` ${timestamp.toLocaleTimeString(locale)}`;
    // console.debug(`timeString() converted ${_timestamp} to ${str} w/locale "${locale}" (toLocaleString() gives "${timestamp.toLocaleString()}")`);
    return str;
};
