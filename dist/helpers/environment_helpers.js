"use strict";
/*
 * Helpers for environment variables
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isQuickMode = exports.isLoadTest = exports.isProduction = exports.isDebugMode = exports.isDeepDebug = void 0;
console.log(`[FediAlgo] NODE_ENV="${process.env.NODE_ENV}"`, `\n          FEDIALGO_DEBUG="${process.env.FEDIALGO_DEBUG}"`, `\n          FEDIALGO_DEEP_DEBUG="${process.env.FEDIALGO_DEEP_DEBUG}"`, `\n          QUICK_MODE=${process.env.QUICK_MODE}`, `\n          LOAD_TEST=${process.env.LOAD_TEST}`);
// Set for a whole lot more logging
exports.isDeepDebug = process.env.FEDIALGO_DEEP_DEBUG === "true";
exports.isDebugMode = exports.isDeepDebug || process.env.FEDIALGO_DEBUG === "true";
exports.isProduction = process.env.NODE_ENV === "production";
// Set for long stress tests, pulling tons of data from the mastodon API
exports.isLoadTest = process.env.LOAD_TEST === "true";
// Set for a much shorter startup time, useful for development and testing
exports.isQuickMode = process.env.QUICK_MODE === "true";
//# sourceMappingURL=environment_helpers.js.map