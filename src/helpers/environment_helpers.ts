/*
 * Helpers for environment variables.
 *
 * NOTE: In the browser process.env CANNOT be indexed dynamically! For example these work:
 *       process.env.FEDIALGO_DEBUG;
 *       process.env['FEDIALGO_DEBUG'];
 *
 * But this DOES NOT work:
 *       const fedialgoDebug = 'FEDIALGO_DEBUG';
 *       process.env[fedialgoDebug];
 *
 * This happens because in the browser process.env isn't a true environment - instead webpack manually
 * replaces references to process.env.VAR_NAME at build time
 */
import { FEDIALGO, bracketed } from "./string_helpers";


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


// Log the environment variables we care about to the browser console
const envVars = {
    NODE_ENV: process.env.NODE_ENV,
    FEDIALGO_DEBUG: process.env.FEDIALGO_DEBUG,
    FEDIALGO_DEEP_DEBUG: process.env.FEDIALGO_DEEP_DEBUG,
    LOAD_TEST: process.env.LOAD_TEST,
    QUICK_MODE: process.env.QUICK_MODE,
};

const envVarLogLines = Object.entries(envVars).map(([k, v]) => `${k}="${v}"`);
const bracketedFediAlgo = bracketed(FEDIALGO);
console.debug(bracketedFediAlgo + ' ' + envVarLogLines.join('\n' + ' '.repeat(bracketedFediAlgo.length + 1)));
