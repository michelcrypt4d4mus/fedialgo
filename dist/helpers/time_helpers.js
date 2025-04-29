"use strict";
/*
 * Helpers for time-related operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ageOfTimestampInSeconds = exports.ageInSeconds = void 0;
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
//# sourceMappingURL=time_helpers.js.map