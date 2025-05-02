/*
 * Helpers for environment variables
 */

export function isDebugMode(): boolean {
    return process.env.DEBUG === "true";
};


export const TRACE_LOG = isDebugMode();
