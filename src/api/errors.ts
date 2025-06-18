/**
 * Functions for handling Mastodon API errors.
 * @module api_errors
 */
import { apiLogger, ACCESS_TOKEN_REVOKED_MSG, RATE_LIMIT_ERROR_MSG } from "./api";
import { Logger } from "../helpers/logger";

const RATE_LIMIT_USER_WARNING = "Your Mastodon server is complaining about too many requests coming too quickly. Wait a bit and try again later.";


/**
 * Returns true if the error is an access token revoked error.
 * @param {Error | unknown} e - The error to check.
 * @returns {boolean} True if the error is an access token revoked error.
 */
export function isAccessTokenRevokedError(e: Error | unknown): boolean {
    if (!(e instanceof Error)) {
        apiLogger.warn(`error 'e' is not an instance of Error:`, e);
        return false;
    }

    return e.message.includes(ACCESS_TOKEN_REVOKED_MSG);
};


/**
 * Returns true if the error is a rate limit error.
 * @param {Error | unknown} e - The error to check.
 * @returns {boolean} True if the error is a rate limit error.
 */
export function isRateLimitError(e: Error | unknown): boolean {
    if (!(e instanceof Error)) {
        apiLogger.warn(`error 'e' is not an instance of Error:`, e);
        return false;
    }

    return e.message.includes(RATE_LIMIT_ERROR_MSG);
};


/**
 * Throws if the error is an access token revoked error, otherwise logs and moves on.
 * @param {Logger} logger - Logger instance.
 * @param {unknown} error - The error to check.
 * @param {string} msg - Message to log.
 * @throws {unknown} If the error is an access token revoked error.
 */
export function throwIfAccessTokenRevoked(logger: Logger, error: unknown, msg: string): void {
    logger.error(`${msg}. Error:`, error);
    if (isAccessTokenRevokedError(error)) throw error;
};


/**
 * Throws a sanitized rate limit error if detected, otherwise logs and throws the original error.
 * @param {unknown} error - The error to check.
 * @param {string} msg - Message to log.
 * @throws {string|unknown} Throws a user-friendly rate limit warning or the original error.
 */
export function throwSanitizedRateLimitError(error: unknown, msg: string): void {
    if (isRateLimitError(error)) {
        apiLogger.error(`Rate limit error:`, error);
        throw RATE_LIMIT_USER_WARNING;
    } else {
        apiLogger.logAndThrowError(msg, error);
    }
};
