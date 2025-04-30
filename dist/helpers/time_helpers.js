"use strict";
/*
 * Helpers for time-related operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.toISOFormat = exports.ageOfTimestampInSeconds = exports.ageInSeconds = void 0;
function ageInSeconds(date) {
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