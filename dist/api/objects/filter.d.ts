/**
 * Helpers for Mastodon API's server side filters.
 * @module server_side_filters
 */
import { mastodon } from "masto";
/**
 * Build a regex that matches any of the muted keywords from server-side filters.
 * @memberof module:server_side_filters
 * @param {mastodon.v2.Filter[]} serverSideFilters
 * @returns {RegExp}
 */
export declare function buildMutedRegex(serverSideFilters: mastodon.v2.Filter[]): RegExp;
/**
 * Extract all the muted keywords from server-side filters.
 * @memberof module:server_side_filters
 * @param {mastodon.v2.Filter[]} serverSideFilters
 * @returns {string[]}
 */
export declare function extractMutedKeywords(serverSideFilters: mastodon.v2.Filter[]): string[];
