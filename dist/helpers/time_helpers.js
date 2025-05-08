"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.subtractSeconds = exports.timelineCutoffAt = exports.nowString = exports.timeString = exports.quotedISOFmt = exports.toISOFormat = exports.mostRecent = exports.ageString = exports.ageInMinutes = exports.ageInSeconds = void 0;
/*
 * Helpers for time-related operations
 */
const config_1 = require("../config");
const string_helpers_1 = require("./string_helpers");
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const PARSEABLE_DATE_TYPES = ["string", "number"];
const SECONDS_IN_DAY = 24 * config_1.SECONDS_IN_HOUR;
const SECONDS_IN_WEEK = 7 * SECONDS_IN_DAY;
// Compute the difference from 'date' to now in seconds.
// Accepts ISO format strings, millisecond timestamps, and Date objects.
function ageInSeconds(date) {
    if (date == null) {
        console.warn("Invalid date passed to ageInSeconds():", date);
        return -1;
    }
    let _date = PARSEABLE_DATE_TYPES.includes(typeof date) ? new Date(date) : date;
    return (Date.now() - _date.getTime()) / 1000;
}
exports.ageInSeconds = ageInSeconds;
;
// Compute the difference from 'date' to now in minutes
function ageInMinutes(date) {
    return ageInSeconds(date) / 60.0;
}
exports.ageInMinutes = ageInMinutes;
;
// Make a nice string like "in 2.5 minutes"
function ageString(date) {
    if (date == null)
        return string_helpers_1.NULL;
    const seconds = ageInSeconds(date);
    const secondsStr = seconds < 0.1 ? seconds.toFixed(3) : seconds.toFixed(1);
    return `in ${secondsStr} seconds`;
}
exports.ageString = ageString;
;
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
// To the format YYYY-MM-DDTHH:MM:SSZ
function toISOFormat(date, withMilliseconds) {
    let isoString;
    if (!date) {
        return string_helpers_1.NULL;
    }
    else if (typeof date === "string") {
        isoString = new Date(date).toISOString();
    }
    else {
        isoString = date.toISOString();
    }
    return withMilliseconds ? isoString : isoString.replace(/\.\d+/, "");
}
exports.toISOFormat = toISOFormat;
;
// toISOFormat() but with quotes around it.
function quotedISOFmt(date, withMilliseconds) {
    if (date == null)
        return string_helpers_1.NULL;
    return (0, string_helpers_1.quoted)(toISOFormat(date, withMilliseconds));
}
exports.quotedISOFmt = quotedISOFmt;
;
// Generate a string representing a timestamp.
const timeString = (_timestamp, locale) => {
    if (_timestamp == null)
        return string_helpers_1.NULL;
    locale ||= config_1.DEFAULT_LOCALE;
    const timestamp = (typeof _timestamp == 'string') ? new Date(_timestamp) : _timestamp;
    let str;
    if (ageInSeconds(timestamp) < (SECONDS_IN_DAY * 6)) {
        str = (timestamp.getDate() == new Date().getDate()) ? "today" : DAY_NAMES[timestamp.getDay()];
    }
    else {
        str = timestamp.toLocaleDateString(locale);
    }
    str += ` ${timestamp.toLocaleTimeString(locale)}`;
    // console.debug(`timeString() converted ${_timestamp} to ${str} w/locale "${locale}" (toLocaleString() gives "${timestamp.toLocaleString()}")`);
    return str;
};
exports.timeString = timeString;
// Timestamp string for the current time
function nowString() {
    const now = new Date();
    return `${now.toLocaleDateString()} ${now.toLocaleTimeString().split(".")[0]}`;
}
exports.nowString = nowString;
;
// Return the oldest timestamp we should feed timeline toots until
function timelineCutoffAt() {
    const timelineLookBackMS = config_1.Config.maxTimelineDaysToFetch * SECONDS_IN_DAY * 1000;
    return subtractSeconds(new Date(), timelineLookBackMS);
}
exports.timelineCutoffAt = timelineCutoffAt;
;
// Subtract 'seconds' from 'date' and return the new Date
function subtractSeconds(date, seconds) {
    return new Date(date.getTime() - (seconds * 1000));
}
exports.subtractSeconds = subtractSeconds;
;
//# sourceMappingURL=time_helpers.js.map