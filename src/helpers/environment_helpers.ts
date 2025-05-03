/*
 * Helpers for environment variables
 */

export function isDebugMode(): boolean {
    return process.env.DEBUG === "true";
};


console.log(`[FediAlgo] NODE_ENV:`, process.env.NODE_ENV, `process.env.DEBUG:`, process.env.DEBUG);
