/**
 * Helpers for Mastodon API's server side filters.
 * @module server_side_filters
 */

import { mastodon } from "masto";

import { wordsRegex } from "../../helpers/string_helpers";


/**
 * Build a regex that matches any of the muted keywords from server-side filters.
 * @memberof module:server_side_filters
 * @param {mastodon.v2.Filter[]} serverSideFilters
 * @returns {RegExp}
 */
export function buildMutedRegex(serverSideFilters: mastodon.v2.Filter[]): RegExp {
    return wordsRegex(extractMutedKeywords(serverSideFilters));
};


/**
 * Extract all the muted keywords from server-side filters.
 * @memberof module:server_side_filters
 * @param {mastodon.v2.Filter[]} serverSideFilters
 * @returns {string[]}
 */
export function extractMutedKeywords(serverSideFilters: mastodon.v2.Filter[]): string[] {
    let keywords = serverSideFilters.map(f => f.keywords.map(k => k.keyword)).flat().flat().flat();
    keywords = keywords.map(k => k.toLowerCase().replace(/^#/, ""));
    // logger.trace(`<mutedKeywords()> found ${keywords.length} keywords:`, keywords);
    return keywords;
};
