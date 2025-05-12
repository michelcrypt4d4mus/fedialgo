/*
 * Helpers for environment variables
 */

console.log(
    `[FediAlgo] NODE_ENV=`, process.env.NODE_ENV,
    `, FEDIALGO_DEBUG=`, process.env.FEDIALGO_DEBUG,
    `, QUICK_MODE=`, process.env.QUICK_MODE,
    `, LOAD_TEST=`, process.env.LOAD_TEST
);

export const isDebugMode = process.env.FEDIALGO_DEBUG === "true";
export const isLoadTest = process.env.LOAD_TEST === "true";
export const isProduction = process.env.NODE_ENV === "production";
export const isQuickMode = process.env.QUICK_MODE === "true" || isDebugMode;
