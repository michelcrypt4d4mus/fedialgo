"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.timeString = exports.toISOFormat = exports.ageOfTimestampInSeconds = exports.ageInSeconds = exports.SECONDS_IN_DAY = exports.SECONDS_IN_HOUR = exports.SECONDS_IN_MINUTE = void 0;
/*
 * Helpers for time-related operations
 */
const string_helpers_1 = require("./string_helpers");
exports.SECONDS_IN_MINUTE = 60;
exports.SECONDS_IN_HOUR = 3600;
exports.SECONDS_IN_DAY = 86400;
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
function ageInSeconds(date) {
    if (!date) {
        return -1;
    }
    date = typeof date === "string" ? new Date(date) : date;
    return (Date.now() - date.getTime()) / 1000;
}
exports.ageInSeconds = ageInSeconds;
;
function ageOfTimestampInSeconds(timestamp) {
    return (Date.now() - timestamp) / 1000;
}
exports.ageOfTimestampInSeconds = ageOfTimestampInSeconds;
;
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