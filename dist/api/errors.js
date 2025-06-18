"use strict";
/**
 * Functions for handling Mastodon API errors.
 * @module api_errors
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.throwSanitizedRateLimitError = exports.throwIfAccessTokenRevoked = exports.isRateLimitError = exports.isAccessTokenRevokedError = void 0;
const api_1 = require("./api");
const RATE_LIMIT_USER_WARNING = "Your Mastodon server is complaining about too many requests coming too quickly. Wait a bit and try again later.";
/**
 * Returns true if the error is an access token revoked error.
 * @param {Error | unknown} e - The error to check.
 * @returns {boolean} True if the error is an access token revoked error.
 */
function isAccessTokenRevokedError(e) {
    if (!(e instanceof Error)) {
        api_1.apiLogger.warn(`error 'e' is not an instance of Error:`, e);
        return false;
    }
    return e.message.includes(api_1.ACCESS_TOKEN_REVOKED_MSG);
}
exports.isAccessTokenRevokedError = isAccessTokenRevokedError;
;
/**
 * Returns true if the error is a rate limit error.
 * @param {Error | unknown} e - The error to check.
 * @returns {boolean} True if the error is a rate limit error.
 */
function isRateLimitError(e) {
    if (!(e instanceof Error)) {
        api_1.apiLogger.warn(`error 'e' is not an instance of Error:`, e);
        return false;
    }
    return e.message.includes(api_1.RATE_LIMIT_ERROR_MSG);
}
exports.isRateLimitError = isRateLimitError;
;
/**
 * Throws if the error is an access token revoked error, otherwise logs and moves on.
 * @param {Logger} logger - Logger instance.
 * @param {unknown} error - The error to check.
 * @param {string} msg - Message to log.
 * @throws {unknown} If the error is an access token revoked error.
 */
function throwIfAccessTokenRevoked(logger, error, msg) {
    logger.error(`${msg}. Error:`, error);
    if (isAccessTokenRevokedError(error))
        throw error;
}
exports.throwIfAccessTokenRevoked = throwIfAccessTokenRevoked;
;
/**
 * Throws a sanitized rate limit error if detected, otherwise logs and throws the original error.
 * @param {unknown} error - The error to check.
 * @param {string} msg - Message to log.
 * @throws {string|unknown} Throws a user-friendly rate limit warning or the original error.
 */
function throwSanitizedRateLimitError(error, msg) {
    if (isRateLimitError(error)) {
        api_1.apiLogger.error(`Rate limit error:`, error);
        throw RATE_LIMIT_USER_WARNING;
    }
    else {
        api_1.apiLogger.logAndThrowError(msg, error);
    }
}
exports.throwSanitizedRateLimitError = throwSanitizedRateLimitError;
;
//# sourceMappingURL=errors.js.map