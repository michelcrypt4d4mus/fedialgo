"use strict";
/*
 * Helpers for time-related operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.toISOFormat = exports.ageOfTimestampInSeconds = exports.ageInSeconds = exports.SECONDS_IN_DAY = exports.SECONDS_IN_HOUR = exports.SECONDS_IN_MINUTE = void 0;
exports.SECONDS_IN_MINUTE = 60;
exports.SECONDS_IN_HOUR = 3600;
exports.SECONDS_IN_DAY = 86400;
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
        return "<<NULL_TIME>>";
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
//# sourceMappingURL=time_helpers.js.map