/*
 * Helpers for environment variables
 */

console.log(
    `[FediAlgo] NODE_ENV="${process.env.NODE_ENV}"`,
    `\n          FEDIALGO_DEBUG="${process.env.FEDIALGO_DEBUG}"`,
    `\n          FEDIALGO_DEEP_DEBUG="${process.env.FEDIALGO_DEEP_DEBUG}"`,
    `\n          QUICK_MODE=${process.env.QUICK_MODE}`,
    `\n          LOAD_TEST=${process.env.LOAD_TEST}`
);

// Set for a whole lot more logging
export const isDeepDebug = process.env.FEDIALGO_DEEP_DEBUG === "true";

export const isDebugMode = isDeepDebug || process.env.FEDIALGO_DEBUG === "true";
export const isProduction = process.env.NODE_ENV === "production";

// Set for long stress tests, pulling tons of data from the mastodon API
export const isLoadTest = process.env.LOAD_TEST === "true";
// Set for a much shorter startup time, useful for development and testing
export const isQuickMode = process.env.QUICK_MODE === "true";
