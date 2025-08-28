/*
 * Helpers for environment variables.
 */

console.log(
    `[FediAlgo] NODE_ENV="${process.env.NODE_ENV}"`,
    `\n          FEDIALGO_DEBUG="${process.env.FEDIALGO_DEBUG}"`,
    `\n          FEDIALGO_DEEP_DEBUG="${process.env.FEDIALGO_DEEP_DEBUG}"`,
    `\n          QUICK_MODE=${process.env.QUICK_MODE}`,
    `\n          LOAD_TEST=${process.env.LOAD_TEST}`
);

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
