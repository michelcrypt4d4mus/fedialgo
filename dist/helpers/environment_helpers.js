"use strict";
/*
 * Helpers for environment variables.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isQuickMode = exports.isLoadTest = exports.isDebugMode = exports.isDeepDebug = exports.isTest = exports.isProduction = exports.isDevelopment = void 0;
const string_helpers_1 = require("./string_helpers");
const bracketedFedialgo = (0, string_helpers_1.bracketed)(string_helpers_1.FEDIALGO);
const logLineJoiner = '\n' + ' '.repeat(bracketedFedialgo.length + 1);
const envVarsToLog = [
    `${bracketedFedialgo} NODE_ENV="${process.env.NODE_ENV}"`,
    `FEDIALGO_DEBUG="${process.env.FEDIALGO_DEBUG}"`,
    `FEDIALGO_DEEP_DEBUG="${process.env.FEDIALGO_DEEP_DEBUG}"`,
    `QUICK_MODE=${process.env.QUICK_MODE}`,
    `LOAD_TEST=${process.env.LOAD_TEST}`
];
console.log(envVarsToLog.join(logLineJoiner));
exports.isDevelopment = process.env.NODE_ENV === "development";
exports.isProduction = process.env.NODE_ENV === "production";
exports.isTest = process.env.NODE_ENV === "test";
// Set for a lot more logging
exports.isDeepDebug = process.env.FEDIALGO_DEEP_DEBUG === "true";
// Even logging, some configuration changes
exports.isDebugMode = exports.isDeepDebug || process.env.FEDIALGO_DEBUG === "true";
// Set for long stress tests, pulling tons of data from the mastodon API
exports.isLoadTest = process.env.LOAD_TEST === "true";
// Set for a much shorter startup time, useful for development and testing
exports.isQuickMode = process.env.QUICK_MODE === "true";
//# sourceMappingURL=environment_helpers.js.map