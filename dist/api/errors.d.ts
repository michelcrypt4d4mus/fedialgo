import { Logger } from "../helpers/logger";
/**
 * Returns true if the error is an access token revoked error.
 * @param {Error | unknown} e - The error to check.
 * @returns {boolean} True if the error is an access token revoked error.
 */
export declare function isAccessTokenRevokedError(e: Error | unknown): boolean;
/**
 * Returns true if the error is a rate limit error.
 * @param {Error | unknown} e - The error to check.
 * @returns {boolean} True if the error is a rate limit error.
 */
export declare function isRateLimitError(e: Error | unknown): boolean;
/**
 * Throws if the error is an access token revoked error, otherwise logs and moves on.
 * @param {Logger} logger - Logger instance.
 * @param {unknown} error - The error to check.
 * @param {string} msg - Message to log.
 * @throws {unknown} If the error is an access token revoked error.
 */
export declare function throwIfAccessTokenRevoked(logger: Logger, error: unknown, msg: string): void;
/**
 * Throws a sanitized rate limit error if detected, otherwise logs and throws the original error.
 * @param {unknown} error - The error to check.
 * @param {string} msg - Message to log.
 * @throws {string|unknown} Throws a user-friendly rate limit warning or the original error.
 */
export declare function throwSanitizedRateLimitError(error: unknown, msg: string): void;
