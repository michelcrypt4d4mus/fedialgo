/**
 * @fileoverview Functions for handling Mastodon API errors.
 * @module api_errors
 */

import { apiLogger } from "./api";
import { config } from "../config";
import { type Logger } from "../helpers/logger";

type UnknownError = Error | unknown;


/**
 * Returns true if the error is an access token revoked error.
 * @param {UnknownError} error - The error to check.
 * @returns {boolean} True if the error is an access token revoked error.
 */
export function isAccessTokenRevokedError(error: UnknownError): boolean {
    if (!(error instanceof Error)) {
        apiLogger.warn(`error 'e' is not an instance of Error:`, error);
        return false;
    }

    return error.message.includes(config.api.errorMsgs.accessTokenRevoked);
};


/**
 * Returns true if the error is a rate limit error.
 * @param {UnknownError} error - The error to check.
 * @returns {boolean} True if the error is a rate limit error.
 */
export function isRateLimitError(error: UnknownError): boolean {
    if (!(error instanceof Error)) {
        apiLogger.warn(`error 'e' is not an instance of Error:`, error);
        return false;
    }

    return error.message.includes(config.api.errorMsgs.rateLimitError);
};


/**
 * Throws if the error is an access token revoked error, otherwise logs and moves on.
 * @param {Logger} logger - Logger instance.
 * @param {UnknownError} error - The error to check.
 * @param {string} msg - Message to log.
 * @throws {unknown} If the error is an access token revoked error.
 */
export function throwIfAccessTokenRevoked(logger: Logger, error: UnknownError, msg: string): void {
    logger.error(`${msg}. Error:`, error);
    if (isAccessTokenRevokedError(error)) throw error;
};


/**
 * Throws a sanitized rate limit error if detected, otherwise logs and throws the original error.
 * @param {UnknownError} error - The error to check.
 * @param {string} msg - Message to log.
 * @throws {string|unknown} Throws a user-friendly rate limit warning or the original error.
 */
export function throwSanitizedRateLimitError(error: UnknownError, msg: string): void {
    if (isRateLimitError(error)) {
        apiLogger.error(`Rate limit error:`, error);
        throw config.api.errorMsgs.rateLimitWarning;
    } else {
        apiLogger.logAndThrowError(msg, error);
    }
};
