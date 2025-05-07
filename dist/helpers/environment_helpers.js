"use strict";
/*
 * Helpers for environment variables
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isLoadTest = exports.isProduction = exports.isDebugMode = void 0;
console.log(`[FediAlgo] NODE_ENV:`, process.env.NODE_ENV, `, process.env.DEBUG:`, process.env.DEBUG);
exports.isDebugMode = process.env.DEBUG === "true";
exports.isProduction = process.env.NODE_ENV === "production";
exports.isLoadTest = process.env.LOAD_TEST === "true";
if (exports.isLoadTest) {
    console.warn(`[FediAlgo] Load test mode enabled. This is not a production build.`);
}
else {
    console.log(`[FediAlgo] Load test mode disabled.`);
}
console.info(`[FediAlgo] JUNK_MODE mode:`, process.env.JUNK_MODE);
//# sourceMappingURL=environment_helpers.js.map