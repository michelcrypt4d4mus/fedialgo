"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.timeString = exports.quotedISOFmt = exports.toISOFormat = exports.ageInSeconds = exports.SECONDS_IN_DAY = exports.SECONDS_IN_HOUR = exports.SECONDS_IN_MINUTE = void 0;
/*
 * Helpers for time-related operations
 */
const string_helpers_1 = require("./string_helpers");
exports.SECONDS_IN_MINUTE = 60;
exports.SECONDS_IN_HOUR = 3600;
exports.SECONDS_IN_DAY = 86400;
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const PARSEABLE_DATE_TYPES = ["string", "number"];
// Compute the difference from 'date' to now in seconds.
// Accepts ISO format strings, millisecond timestamps, and Date objects.
function ageInSeconds(date) {
    if (!date) {
        console.warn("Invalid date passed to ageInSeconds:", date);
        return -1;
    }
    let _date = PARSEABLE_DATE_TYPES.includes(typeof date) ? new Date(date) : date;
    return (Date.now() - _date.getTime()) / 1000;
}
exports.ageInSeconds = ageInSeconds;
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
const timeString = (timestamp) => {
    if (timestamp == null)
        return string_helpers_1.NULL;
    timestamp = typeof timestamp == 'string' ? new Date(timestamp) : timestamp;
    if (timestamp.getDate() === new Date().getDate()) {
        return `Today ${timestamp.toLocaleTimeString()}`;
    }
    else {
        return `${DAY_NAMES[timestamp.getDay()]} ${timestamp.toLocaleTimeString()}`;
    }
};
exports.timeString = timeString;
//# sourceMappingURL=time_helpers.js.map