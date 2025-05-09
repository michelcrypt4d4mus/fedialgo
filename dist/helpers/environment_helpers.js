"use strict";
/*
 * Helpers for environment variables
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isLoadTest = exports.isProduction = exports.isQuickMode = exports.isDebugMode = void 0;
console.log(`[FediAlgo] NODE_ENV:`, process.env.NODE_ENV, `, process.env.DEBUG:`, process.env.DEBUG);
exports.isDebugMode = process.env.DEBUG === "true";
exports.isQuickMode = process.env.QUICK_MODE === "true";
exports.isProduction = process.env.NODE_ENV === "production";
exports.isLoadTest = process.env.LOAD_TEST === "true";
if (exports.isLoadTest) {
    console.warn(`[FediAlgo] LOAD_TEST=true mode enabled.`);
}
//# sourceMappingURL=environment_helpers.js.map