"use strict";
/**
 * Helpers for time-related operations
 * @module time_helpers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaitTime = exports.toISOFormatIfExists = exports.toISOFormat = exports.timelineCutoffAt = exports.timeString = exports.subtractSeconds = exports.sleep = exports.quotedISOFmt = exports.nowString = exports.mostRecent = exports.coerceDate = exports.ageString = exports.AgeIn = void 0;
const lodash_1 = require("lodash");
const config_1 = require("../config");
const enums_1 = require("../enums");
const string_helpers_1 = require("./string_helpers");
const PARSEABLE_DATE_TYPES = new Set(["string", "number"]);
/** Helper class for computing age differences in various units. */
class AgeIn {
    /**
     * Milliseconds of difference between a given time and either now or an optional end time.
     * @param {DateArg} startTime - The time to calculate the age from.
     * @param {DateArg} [endTime] - Optional end time to calculate the age to (defaults to now)
     * @returns {number} The age in milliseconds, or -1 if the start time is invalid.
     */
    static ms(startTime, endTime) {
        if (!startTime) {
            console.warn("Invalid date passed to AgeIn.ms():", startTime);
            return -1;
        }
        endTime = coerceDate(endTime || new Date());
        return endTime.getTime() - coerceDate(startTime).getTime();
    }
    /**
     * Hours of difference between a given time and either now or an optional end time.
     * @param {DateArg} startTime - The time to calculate the age from.
     * @param {DateArg} [endTime] - Optional end time to calculate the age to (defaults to now)
     * @returns {number} The age in hours, or a negative number if the start time is invalid.
     */
    static hours(startTime, endTime) {
        return this.minutes(startTime, endTime) / 60.0;
    }
    /**
     * Minutes of difference between a given time and either now or an optional end time.
     * @param {DateArg} startTime - The time to calculate the age from.
     * @param {DateArg} [endTime] - Optional end time to calculate the age to (defaults to now)
     * @returns {number} The age in milliseconds, or a negative number if the start time is invalid.
     */
    static minutes(startTime, endTime) {
        return this.seconds(startTime, endTime) / 60.0;
    }
    /**
     * Seconds of difference between a given time and either now or an optional end time.
     * @param {DateArg} startTime - The time to calculate the age from.
     * @param {DateArg} [endTime] - Optional end time to calculate the age to (defaults to now)
     * @returns {number} The age in seconds, or a negative number if the start time is invalid.
     */
    static seconds(startTime, endTime) {
        return this.ms(startTime, endTime) / 1000.0;
    }
}
exports.AgeIn = AgeIn;
/**
 * Make a nice string like "in 2.5 minutes" representing time from a date to now.
 * @param {DateArg} date - The date to calculate the age from.
 * @returns {string} A string representing the age in seconds, formatted to 1 decimal place.
 */
function ageString(date) {
    if (!date)
        return string_helpers_1.NULL;
    const seconds = AgeIn.seconds(date);
    const secondsStr = seconds < 0.1 ? seconds.toFixed(3) : seconds.toFixed(1);
    return `in ${secondsStr} seconds`;
}
exports.ageString = ageString;
;
/**
 * Coerce a string or number into a Date object.
 * @param {DateArg} date - The date to coerce.
 * @returns {Optional<Date>} A Date object if coercion is successful, or null if the input is invalid.
 */
function coerceDate(date) {
    if (!date)
        return null;
    return (PARSEABLE_DATE_TYPES.has(typeof date) ? new Date(date) : date);
}
exports.coerceDate = coerceDate;
;
/**
 * Returns the most recent (latest) date from a list of Date or null values.
 * @param {...DateArg[]} args - Dates to compare.
 * @returns {Optional<Date>} The most recent date, or null if none are valid.
 */
function mostRecent(...args) {
    let mostRecentDate = null;
    const coercedArgs = args.filter(a => !(0, lodash_1.isNil)(a)).map(arg => coerceDate(arg));
    for (const arg of coercedArgs) {
        if ((0, lodash_1.isNil)(mostRecentDate) || arg > mostRecentDate) {
            mostRecentDate = arg;
        }
    }
    return mostRecentDate;
}
exports.mostRecent = mostRecent;
;
/**
 * String for the current time in local datetime format, e.g. ""17/06/2025 17:59:58""
 * @returns {string} Localized current date and time string
 */
function nowString() {
    const now = new Date();
    return `${now.toLocaleDateString()} ${now.toLocaleTimeString().split(".")[0]}`;
}
exports.nowString = nowString;
;
/**
 * Returns the ISO format of a date, wrapped in quotes.
 * @param {DateArg} date - The date to format.
 * @param {boolean} [withMilliseconds] - Whether to include milliseconds in the output.
 * @returns {string} The quoted ISO format string, or NULL if date is null.
 */
function quotedISOFmt(date, withMilliseconds) {
    return date ? (0, string_helpers_1.quoted)(toISOFormat(date, withMilliseconds)) : string_helpers_1.NULL;
}
exports.quotedISOFmt = quotedISOFmt;
;
/**
 * Asynchronous sleep helper that pauses execution for the specified number of milliseconds.
 * @param {number} milliseconds - The number of milliseconds to sleep.
 * @returns {Promise<void>} A promise that resolves after the specified time.
 */
async function sleep(milliseconds) {
    await new Promise(r => setTimeout(r, milliseconds));
}
exports.sleep = sleep;
;
/**
 * Subtracts a number of seconds from a date and returns the new Date.
 * @param {Date} date - The original date.
 * @param {number} seconds - The number of seconds to subtract.
 * @returns {Date} The new date with seconds subtracted.
 */
function subtractSeconds(date, seconds) {
    return new Date(date.getTime() - (seconds * 1000));
}
exports.subtractSeconds = subtractSeconds;
;
/**
 * Generate a string representing a timestamp.
 * (new Date()).toLocaleDateString('en-us', { weekday: "long", year: "numeric", month: "short", day: "numeric"})
 *     => 'Thursday, Sep 1, 2022'
 * @param {DateArg} _timestamp - The timestamp to convert to a string.
 * @param {string} [locale] - Optional locale string for formatting the date.
 * @returns {string} A formatted string representing the timestamp, or NULL if the timestamp is invalid.
 */
const timeString = (_timestamp, locale) => {
    if (!_timestamp)
        return string_helpers_1.NULL;
    locale ||= config_1.config.locale.locale;
    ;
    const timestamp = coerceDate(_timestamp);
    const isToday = timestamp.getDate() == new Date().getDate();
    const seconds = AgeIn.seconds(timestamp);
    let str;
    if (isToday) {
        str = "today";
    }
    else if (seconds < 0 && seconds > (-1 * 7 * config_1.SECONDS_IN_DAY)) {
        str = `this coming ${enums_1.DAY_NAMES[timestamp.getDay()]}`; // TODO: use the formatting functions, don't do date lookup manually
    }
    else if (seconds < (config_1.SECONDS_IN_DAY * 6)) {
        str = enums_1.DAY_NAMES[timestamp.getDay()]; // TODO: use the formatting functions, don't do date lookup manually
    }
    else {
        str = timestamp.toLocaleDateString(locale);
    }
    str += ` ${timestamp.toLocaleTimeString(locale)}`;
    // console.debug(`timeString() converted ${_timestamp} to ${str} w/locale "${locale}" (toLocaleString() gives "${timestamp.toLocaleString()}")`);
    return str;
};
exports.timeString = timeString;
/**
 * Returns the oldest timestamp to use as a cutoff for timeline toots, based on config settings.
 * @returns {Date} The cutoff date for timeline toots.
 */
function timelineCutoffAt() {
    const timelineLookBackSeconds = config_1.config.toots.maxAgeInDays * config_1.SECONDS_IN_DAY;
    return subtractSeconds(new Date(), timelineLookBackSeconds);
}
exports.timelineCutoffAt = timelineCutoffAt;
;
/**
 * Date to the format YYYY-MM-DDTHH:MM:SSZ
 * @param {DateArg} date - The date to convert to ISO format.
 * @param {boolean} [withMilliseconds=false] - If true, includes milliseconds in the output.
 * @returns {string} The date in ISO format.
 */
function toISOFormat(date, withMilliseconds) {
    if (!date)
        return string_helpers_1.NULL;
    const isoString = coerceDate(date).toISOString();
    return withMilliseconds ? isoString : isoString.replace(/\.\d+/, "");
}
exports.toISOFormat = toISOFormat;
;
/**
 * Like toISOFormat() but returns null if the date is undefined or null.
 * @param {DateArg} date - The date to convert to ISO format.
 * @param {boolean} [withMilliseconds=false] - If true, includes milliseconds in the output.
 * @returns {string} The date in ISO format, or NULL if the date is invalid.
 */
function toISOFormatIfExists(date, withMilliseconds) {
    return date ? toISOFormat(date, withMilliseconds) : null;
}
exports.toISOFormatIfExists = toISOFormatIfExists;
;
/** Helper class for telemetry. */
class WaitTime {
    avgMsPerRequest = 0;
    milliseconds = 0;
    numRequests = 0;
    startedAt = new Date();
    ageInSeconds() {
        return AgeIn.seconds(this.startedAt);
    }
    ageString() {
        return ageString(this.startedAt);
    }
    markStart() {
        this.startedAt = new Date();
    }
    markEnd() {
        this.numRequests++;
        this.milliseconds += AgeIn.ms(this.startedAt);
        this.avgMsPerRequest = this.milliseconds / this.numRequests;
    }
}
exports.WaitTime = WaitTime;
;
//# sourceMappingURL=time_helpers.js.map