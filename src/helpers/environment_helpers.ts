/*
 * Helpers for environment variables.
 */

import { FEDIALGO, bracketed } from "./string_helpers";


const bracketedFedialgo = bracketed(FEDIALGO);
const logLineJoiner = '\n' + ' '.repeat(bracketedFedialgo.length + 1);

const envVarsToLog = [
    `${bracketedFedialgo} NODE_ENV="${process.env.NODE_ENV}"`,
    `FEDIALGO_DEBUG="${process.env.FEDIALGO_DEBUG}"`,
    `FEDIALGO_DEEP_DEBUG="${process.env.FEDIALGO_DEEP_DEBUG}"`,
    `QUICK_MODE=${process.env.QUICK_MODE}`,
    `LOAD_TEST=${process.env.LOAD_TEST}`
];

console.log(envVarsToLog.join(logLineJoiner));

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
