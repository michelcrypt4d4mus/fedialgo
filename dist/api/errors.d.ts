/**
 * Functions for handling Mastodon API errors.
 * @module api_errors
 */
import { type Logger } from "../helpers/logger";
type UnknownError = Error | unknown;
/**
 * Returns true if the error is an access token revoked error.
 * @param {UnknownError} error - The error to check.
 * @returns {boolean} True if the error is an access token revoked error.
 */
export declare function isAccessTokenRevokedError(error: UnknownError): boolean;
/**
 * Returns true if the error is a rate limit error.
 * @param {UnknownError} error - The error to check.
 * @returns {boolean} True if the error is a rate limit error.
 */
export declare function isRateLimitError(error: UnknownError): boolean;
/**
 * Throws if the error is an access token revoked error, otherwise logs and moves on.
 * @param {Logger} logger - Logger instance.
 * @param {UnknownError} error - The error to check.
 * @param {string} msg - Message to log.
 * @throws {unknown} If the error is an access token revoked error.
 */
export declare function throwIfAccessTokenRevoked(logger: Logger, error: UnknownError, msg: string): void;
/**
 * Throws a sanitized rate limit error if detected, otherwise logs and throws the original error.
 * @param {UnknownError} error - The error to check.
 * @param {string} msg - Message to log.
 * @throws {string|unknown} Throws a user-friendly rate limit warning or the original error.
 */
export declare function throwSanitizedRateLimitError(error: UnknownError, msg: string): void;
export {};
