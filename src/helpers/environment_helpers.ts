/*
 * Helpers for environment variables.
 */

import { FEDIALGO, bracketed } from "./string_helpers";

const BRACKETED_FEDIALGO = bracketed(FEDIALGO);
const ENV_VARS_TO_LOG = ['NODE_ENV', 'FEDIALGO_DEBUG', 'FEDIALGO_DEEP_DEBUG', 'QUICK_MODE', 'LOAD_TEST'];


export const isDevelopment = process.env.NODE_ENV === "development";
export const isProduction = process.env.NODE_ENV === "production";
export const isTest = process.env.NODE_ENV === "test";

// Set for a lot more logging
export const isDeepDebug = process.env.FEDIALGO_DEEP_DEBUG === "true";
// Even logging, some configuration changes
export const isDebugMode = isDeepDebug || process.env.FEDIALGO_DEBUG === "true";

// Set for long stress tests, pulling tons of data from the mastodon API
export const isLoadTest = process.env.LOAD_TEST === "true";
// Set for a much shorter startup time, useful for development and testing
export const isQuickMode = process.env.QUICK_MODE === "true";


/**
 * Read array of environment variables and return them as a dictionary.
 * @param {string[]} varNames - Array of environment variable names to get
 * @returns {Record<string, string | undefined>} Dictionary of env var names to their values (undefined if not set)
 */
export function getEnvVars(varNames: string[]): Record<string, string | undefined> {
    return varNames.reduce((dict, v) => {
        const envVar = process.env[v];
        const fedialgo_debug = 'FEDIALGO_DEBUG';
        console.log(`getEnvVars: checking for "${v}" in process.env (value = "${envVar}")
            process.env.FEDIALGO_DEBUG=${process.env.FEDIALGO_DEBUG}
            process.env['FEDIALGO_DEBUG']=${process.env['FEDIALGO_DEBUG']}
            fedialgo_debug="${fedialgo_debug}"
            process.env[fedialgo_debug]=${process.env[fedialgo_debug]}
            dict is now:`, dict);
        return {...dict, [v]: process.env[v]};
     }, {});
};


const envVars = {

};

const envVarLogLines = Object.entries(envVars).map(([k, v]) => `${k}="${v}"`);
console.log(BRACKETED_FEDIALGO + ' ' + envVarLogLines.join('\n' + ' '.repeat(BRACKETED_FEDIALGO.length + 1)));
console.log("process.env.NODE_ENV =", process.env.NODE_ENV);
console.log("process.env['NODE_ENV'] =", process.env["NODE_ENV"]);
console.log(`envVars: `, envVars);
console.log(`process.env: `, process.env);
