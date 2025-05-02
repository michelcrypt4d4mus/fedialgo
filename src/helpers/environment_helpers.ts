/*
 * Helpers for environment variables
 */

export function isDebugMode(): boolean {
    return process.env.DEBUG === "true";
};

export const TRACE_LOG = isDebugMode();

console.log(`[FediAlgo] process.env.NODE_ENV:`, process.env.NODE_ENV);
console.log(`[FediAlgo] process.env.DEBUG:`, process.env.DEBUG);
