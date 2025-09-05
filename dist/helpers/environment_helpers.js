"use strict";
/*
 * Helpers for environment variables.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEnvVars = exports.isQuickMode = exports.isLoadTest = exports.isDebugMode = exports.isDeepDebug = exports.isTest = exports.isProduction = exports.isDevelopment = void 0;
const string_helpers_1 = require("./string_helpers");
const BRACKETED_FEDIALGO = (0, string_helpers_1.bracketed)(string_helpers_1.FEDIALGO);
const ENV_VARS_TO_LOG = ['NODE_ENV', 'FEDIALGO_DEBUG', 'FEDIALGO_DEEP_DEBUG', 'QUICK_MODE', 'LOAD_TEST'];
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
/**
 * Read array of environment variables and return them as a dictionary.
 * @param {string[]} varNames - Array of environment variable names to get
 * @returns {Record<string, string | undefined>} Dictionary of env var names to their values (undefined if not set)
 */
function getEnvVars(varNames) {
    return varNames.reduce((dict, v) => {
        const envVar = process.env[v];
        const fedialgo_debug = 'FEDIALGO_DEBUG';
        console.log(`getEnvVars: checking for "${v}" in process.env (value = "${envVar}")
            process.env.FEDIALGO_DEBUG=${process.env.FEDIALGO_DEBUG}
            process.env['FEDIALGO_DEBUG']=${process.env['FEDIALGO_DEBUG']}
            fedialgo_debug="${fedialgo_debug}"
            process.env[fedialgo_debug]=${process.env[fedialgo_debug]}
            dict is now:`, dict);
        return { ...dict, [v]: process.env[v] };
    }, {});
}
exports.getEnvVars = getEnvVars;
;
const envVars = getEnvVars(ENV_VARS_TO_LOG);
const envVarLogLines = Object.entries(envVars).map(([k, v]) => `${k}="${v}"`);
console.log(BRACKETED_FEDIALGO + ' ' + envVarLogLines.join('\n' + ' '.repeat(BRACKETED_FEDIALGO.length + 1)));
console.log("process.env.NODE_ENV =", process.env.NODE_ENV);
console.log("process.env['NODE_ENV'] =", process.env["NODE_ENV"]);
console.log(`envVars: `, envVars);
console.log(`process.env: `, process.env);
//# sourceMappingURL=environment_helpers.js.map