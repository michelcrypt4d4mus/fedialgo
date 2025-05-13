"use strict";
/*
 * Helpers for environment variables
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isQuickMode = exports.isProduction = exports.isLoadTest = exports.isDebugMode = void 0;
console.log(`[FediAlgo] NODE_ENV=`, process.env.NODE_ENV, `, FEDIALGO_DEBUG=`, process.env.FEDIALGO_DEBUG, `, QUICK_MODE=`, process.env.QUICK_MODE, `, LOAD_TEST=`, process.env.LOAD_TEST);
exports.isDebugMode = process.env.FEDIALGO_DEBUG === "true";
exports.isLoadTest = process.env.LOAD_TEST === "true";
exports.isProduction = process.env.NODE_ENV === "production";
exports.isQuickMode = exports.isDebugMode || (process.env.QUICK_MODE === "true");
//# sourceMappingURL=environment_helpers.js.map