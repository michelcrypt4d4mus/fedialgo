"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nowString = exports.timeString = exports.quotedISOFmt = exports.toISOFormat = exports.inSeconds = exports.inMinutes = exports.ageInMinutes = exports.ageInSeconds = exports.SECONDS_IN_DAY = exports.SECONDS_IN_HOUR = exports.SECONDS_IN_MINUTE = void 0;
/*
 * Helpers for time-related operations
 */
const string_helpers_1 = require("./string_helpers");
exports.SECONDS_IN_MINUTE = 60;
exports.SECONDS_IN_HOUR = 3600;
exports.SECONDS_IN_DAY = 86400;
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const PARSEABLE_DATE_TYPES = ["string", "number"];
const DEFAULT_LOCALE = "en-US";
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
function ageInMinutes(date) {
    return ageInSeconds(date) / exports.SECONDS_IN_MINUTE;
}
exports.ageInMinutes = ageInMinutes;
;
// Make a nice string like "in 2.5 minutes"
function inMinutes(date) {
    const minutes = ageInMinutes(date);
    return `in ${minutes.toFixed(2)} minutes`;
}
exports.inMinutes = inMinutes;
;
// Make a nice string like "in 2.5 minutes"
function inSeconds(date) {
    const seconds = ageInSeconds(date);
    return `in ${seconds.toFixed(1)} seconds`;
}
exports.inSeconds = inSeconds;
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
    return (0, string_helpers_1.quote)(toISOFormat(date, withMilliseconds));
}
exports.quotedISOFmt = quotedISOFmt;
;
// Generate a string representing a timestamp.
const timeString = (_timestamp, locale) => {
    if (_timestamp == null)
        return string_helpers_1.NULL;
    locale ||= DEFAULT_LOCALE;
    const timestamp = (typeof _timestamp == 'string') ? new Date(_timestamp) : _timestamp;
    let str = (timestamp.getDate() == new Date().getDate()) ? "today" : DAY_NAMES[timestamp.getDay()];
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
//# sourceMappingURL=time_helpers.js.map