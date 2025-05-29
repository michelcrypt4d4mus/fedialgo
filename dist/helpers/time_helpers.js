"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toISOFormat = exports.timelineCutoffAt = exports.timeString = exports.subtractSeconds = exports.sleep = exports.quotedISOFmt = exports.nowString = exports.mostRecent = exports.coerceDate = exports.ageString = exports.ageInMS = exports.ageInSeconds = exports.ageInMinutes = exports.ageInHours = void 0;
/*
 * Helpers for time-related operations
 */
const config_1 = require("../config");
const string_helpers_1 = require("./string_helpers");
// TODO: use the formatting functions, don't do date lookup manually
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const PARSEABLE_DATE_TYPES = new Set(["string", "number"]);
// Compute the difference from 'date' to now in minutes
const ageInHours = (date, endTime) => (0, exports.ageInMinutes)(date, endTime) / 60.0;
exports.ageInHours = ageInHours;
const ageInMinutes = (date, endTime) => (0, exports.ageInSeconds)(date, endTime) / 60.0;
exports.ageInMinutes = ageInMinutes;
const ageInSeconds = (date, endTime) => ageInMS(date, endTime) / 1000.0;
exports.ageInSeconds = ageInSeconds;
function ageInMS(date, endTime) {
    if (!date) {
        console.warn("Invalid date passed to ageInSeconds():", date);
        return -1;
    }
    endTime = coerceDate(endTime || new Date());
    return endTime.getTime() - coerceDate(date).getTime();
}
exports.ageInMS = ageInMS;
;
// Make a nice string like "in 2.5 minutes"
function ageString(date) {
    if (!date)
        return string_helpers_1.NULL;
    const seconds = (0, exports.ageInSeconds)(date);
    const secondsStr = seconds < 0.1 ? seconds.toFixed(3) : seconds.toFixed(1);
    return `in ${secondsStr} seconds`;
}
exports.ageString = ageString;
;
// Coerce a string or number into a Date object.
function coerceDate(date) {
    if (!date)
        return null;
    return (PARSEABLE_DATE_TYPES.has(typeof date) ? new Date(date) : date);
}
exports.coerceDate = coerceDate;
;
// Recent the most recent of a list of dates
function mostRecent(...args) {
    let mostRecentDate = null;
    for (const arg of args) {
        if (arg == null)
            continue;
        if (mostRecentDate == null || arg > mostRecentDate) {
            mostRecentDate = arg;
        }
    }
    return mostRecentDate;
}
exports.mostRecent = mostRecent;
;
// Timestamp string for the current time
function nowString() {
    const now = new Date();
    return `${now.toLocaleDateString()} ${now.toLocaleTimeString().split(".")[0]}`;
}
exports.nowString = nowString;
;
// toISOFormat() but with quotes around it.
function quotedISOFmt(date, withMilliseconds) {
    if (date == null)
        return string_helpers_1.NULL;
    return (0, string_helpers_1.quoted)(toISOFormat(date, withMilliseconds));
}
exports.quotedISOFmt = quotedISOFmt;
;
// Sleep helper
async function sleep(milliseconds) {
    await new Promise(r => setTimeout(r, milliseconds));
}
exports.sleep = sleep;
;
// Subtract 'seconds' from 'date' and return the new Date
function subtractSeconds(date, seconds) {
    return new Date(date.getTime() - (seconds * 1000));
}
exports.subtractSeconds = subtractSeconds;
;
// Generate a string representing a timestamp.
// (new Date()).toLocaleDateString('en-us', { weekday: "long", year: "numeric", month: "short", day: "numeric"})
//    => 'Thursday, Sep 1, 2022'
const timeString = (_timestamp, locale) => {
    if (!_timestamp)
        return string_helpers_1.NULL;
    locale ||= config_1.config.locale.locale;
    ;
    const timestamp = coerceDate(_timestamp);
    const isToday = timestamp.getDate() == new Date().getDate();
    const seconds = (0, exports.ageInSeconds)(timestamp);
    let str;
    if (isToday) {
        str = "today";
    }
    else if (seconds < 0 && seconds > (-1 * 7 * config_1.SECONDS_IN_DAY)) {
        str = `this coming ${DAY_NAMES[timestamp.getDay()]}`;
    }
    else if (seconds < (config_1.SECONDS_IN_DAY * 6)) {
        str = DAY_NAMES[timestamp.getDay()];
    }
    else {
        str = timestamp.toLocaleDateString(locale);
    }
    str += ` ${timestamp.toLocaleTimeString(locale)}`;
    // console.debug(`timeString() converted ${_timestamp} to ${str} w/locale "${locale}" (toLocaleString() gives "${timestamp.toLocaleString()}")`);
    return str;
};
exports.timeString = timeString;
// Return the oldest timestamp we should feed timeline toots until
function timelineCutoffAt() {
    const timelineLookBackMS = config_1.config.toots.maxAgeInDays * config_1.SECONDS_IN_DAY * 1000;
    return subtractSeconds(new Date(), timelineLookBackMS);
}
exports.timelineCutoffAt = timelineCutoffAt;
;
// To the format YYYY-MM-DDTHH:MM:SSZ
function toISOFormat(date, withMilliseconds) {
    if (!date)
        return string_helpers_1.NULL;
    const isoString = coerceDate(date).toISOString();
    return withMilliseconds ? isoString : isoString.replace(/\.\d+/, "");
}
exports.toISOFormat = toISOFormat;
;
//# sourceMappingURL=time_helpers.js.map