/**
 * Helpers for Mastodon API's server side {@linkcode https://docs.joinmastodon.org/entities/Filter/ Filters}.
 * @module server_side_filters
 */
import { mastodon } from "masto";
/**
 * Build a regex that matches any of the muted keywords from server-side
 * {@linkcode https://docs.joinmastodon.org/entities/Filter/ Filters}.
 * @memberof module:server_side_filters
 * @param {mastodon.v2.Filter[]} serverSideFilters
 * @returns {RegExp}
 */
export declare function buildMutedRegex(serverSideFilters: mastodon.v2.Filter[]): RegExp;
/**
 * Extract all the muted keywords from server-side
 * {@linkcode https://docs.joinmastodon.org/entities/Filter/ Filters}.
 * @memberof module:server_side_filters
 * @param {mastodon.v2.Filter[]} serverSideFilters
 * @returns {string[]}
 */
export declare function extractMutedKeywords(serverSideFilters: mastodon.v2.Filter[]): string[];
