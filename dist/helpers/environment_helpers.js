"use strict";
/*
 * Helpers for environment variables
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDebugMode = void 0;
function isDebugMode() {
    return process.env.DEBUG === "true";
}
exports.isDebugMode = isDebugMode;
;
console.log(`[FediAlgo] process.env.NODE_ENV:`, process.env.NODE_ENV);
console.log(`[FediAlgo] process.env.DEBUG:`, process.env.DEBUG);
//# sourceMappingURL=environment_helpers.js.map