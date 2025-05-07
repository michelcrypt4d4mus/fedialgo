/*
 * Helpers for environment variables
 */

console.log(`[FediAlgo] NODE_ENV:`, process.env.NODE_ENV, `, process.env.DEBUG:`, process.env.DEBUG);

export const isDebugMode = process.env.DEBUG === "true";
export const isProduction = process.env.NODE_ENV === "production";
export const isLoadTest = process.env.LOAD_TEST === "true";

if (isLoadTest) {
    console.warn(`[FediAlgo] LOAD_TEST=true mode enabled.`);
}
