"use strict";
/*
 * Helpers for environment variables
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isLoadTest = exports.isQuickMode = exports.isProduction = exports.isDebugMode = void 0;
console.log(`[FediAlgo] NODE_ENV="${process.env.NODE_ENV}"`, `, FEDIALGO_DEBUG="${process.env.FEDIALGO_DEBUG}"`, `, QUICK_MODE=${process.env.QUICK_MODE}`, `, LOAD_TEST=${process.env.LOAD_TEST}`);
exports.isDebugMode = process.env.FEDIALGO_DEBUG === "true";
exports.isProduction = process.env.NODE_ENV === "production";
// Set for a much shorter startup time, useful for development and testing
exports.isQuickMode = process.env.QUICK_MODE === "true";
// Set for long stress tests, pulling tons of data from the mastodon API
exports.isLoadTest = process.env.LOAD_TEST === "true";
//# sourceMappingURL=environment_helpers.js.map