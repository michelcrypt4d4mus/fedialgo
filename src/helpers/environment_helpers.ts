/*
 * Helpers for environment variables
 */

console.log(
    `[FediAlgo] NODE_ENV="${process.env.NODE_ENV}"`,
    `, FEDIALGO_DEBUG="${process.env.FEDIALGO_DEBUG}"`,
    `, QUICK_MODE=${process.env.QUICK_MODE}`,
    `, LOAD_TEST=${process.env.LOAD_TEST}`
);

export const isDebugMode = process.env.FEDIALGO_DEBUG === "true";
export const isProduction = process.env.NODE_ENV === "production";

// Set for a much shorter startup time, useful for development and testing
export const isQuickMode = process.env.QUICK_MODE === "true";
// Set for long stress tests, pulling tons of data from the mastodon API
export const isLoadTest = process.env.LOAD_TEST === "true";
