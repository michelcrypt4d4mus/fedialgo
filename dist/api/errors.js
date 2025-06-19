"use strict";
/**
 * Functions for handling Mastodon API errors.
 * @module api_errors
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.throwSanitizedRateLimitError = exports.throwIfAccessTokenRevoked = exports.isRateLimitError = exports.isAccessTokenRevokedError = void 0;
const api_1 = require("./api");
const config_1 = require("../config");
/**
 * Returns true if the error is an access token revoked error.
 * @param {UnknownError} error - The error to check.
 * @returns {boolean} True if the error is an access token revoked error.
 */
function isAccessTokenRevokedError(error) {
    if (!(error instanceof Error)) {
        api_1.apiLogger.warn(`error 'e' is not an instance of Error:`, error);
        return false;
    }
    return error.message.includes(config_1.config.api.errorMsgs.accessTokenRevoked);
}
exports.isAccessTokenRevokedError = isAccessTokenRevokedError;
;
/**
 * Returns true if the error is a rate limit error.
 * @param {UnknownError} error - The error to check.
 * @returns {boolean} True if the error is a rate limit error.
 */
function isRateLimitError(error) {
    if (!(error instanceof Error)) {
        api_1.apiLogger.warn(`error 'e' is not an instance of Error:`, error);
        return false;
    }
    return error.message.includes(config_1.config.api.errorMsgs.rateLimitError);
}
exports.isRateLimitError = isRateLimitError;
;
/**
 * Throws if the error is an access token revoked error, otherwise logs and moves on.
 * @param {Logger} logger - Logger instance.
 * @param {UnknownError} error - The error to check.
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
 * @param {UnknownError} error - The error to check.
 * @param {string} msg - Message to log.
 * @throws {string|unknown} Throws a user-friendly rate limit warning or the original error.
 */
function throwSanitizedRateLimitError(error, msg) {
    if (isRateLimitError(error)) {
        api_1.apiLogger.error(`Rate limit error:`, error);
        throw config_1.config.api.errorMsgs.rateLimitWarning;
    }
    else {
        api_1.apiLogger.logAndThrowError(msg, error);
    }
}
exports.throwSanitizedRateLimitError = throwSanitizedRateLimitError;
;
//# sourceMappingURL=errors.js.map