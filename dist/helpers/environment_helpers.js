"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isQuickMode = exports.isLoadTest = exports.isDebugMode = exports.isDeepDebug = exports.isTest = exports.isProduction = exports.isDevelopment = void 0;
/*
 * Helpers for environment variables.
 *
 * NOTE: in the browser process.env CANNOT be indexed dynamically! For example these work:
 *      process.env.FEDIALGO_DEBUG
 *      process.env['FEDIALGO_DEBUG']
 *
 * But this does NOT work:
 *      const fedialgoDebug = 'FEDIALGO_DEBUG'
 *      process.env[fedialgoDebug]    // NO BUENO!
 *
 * This happens because in the browser process.env isn't a true environment - instead webpack manually
 * replaces references to process.env.VAR_NAME at build time
 */
const string_helpers_1 = require("./string_helpers");
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
// Log the environment variables we care about to the browser console
const envVars = {
    NODE_ENV: process.env.NODE_ENV,
    FEDIALGO_DEBUG: process.env.FEDIALGO_DEBUG,
    FEDIALGO_DEEP_DEBUG: process.env.FEDIALGO_DEEP_DEBUG,
    LOAD_TEST: process.env.LOAD_TEST,
    QUICK_MODE: process.env.QUICK_MODE,
};
const envVarLogLines = Object.entries(envVars).map(([k, v]) => `${k}="${v}"`);
const bracketedFediAlgo = (0, string_helpers_1.bracketed)(string_helpers_1.FEDIALGO);
console.debug(bracketedFediAlgo + ' ' + envVarLogLines.join('\n' + ' '.repeat(bracketedFediAlgo.length + 1)));
//# sourceMappingURL=environment_helpers.js.map