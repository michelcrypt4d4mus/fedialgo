export declare const isDevelopment: boolean;
export declare const isProduction: boolean;
export declare const isTest: boolean;
export declare const isDeepDebug: boolean;
export declare const isDebugMode: boolean;
export declare const isLoadTest: boolean;
export declare const isQuickMode: boolean;
/**
 * Read array of environment variables and return them as a dictionary.
 * @param {string[]} varNames - Array of environment variable names to get
 * @returns {Record<string, string | undefined>} Dictionary of env var names to their values (undefined if not set)
 */
export declare function getEnvVars(varNames: string[]): Record<string, string | undefined>;
