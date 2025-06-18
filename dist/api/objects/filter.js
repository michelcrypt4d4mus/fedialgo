"use strict";
/**
 * Helpers for Mastodon API's server side filters.
 * @module server_side_filters
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractMutedKeywords = exports.buildMutedRegex = void 0;
const string_helpers_1 = require("../../helpers/string_helpers");
/**
 * Build a regex that matches any of the muted keywords from server-side filters.
 * @memberof module:server_side_filters
 * @param {mastodon.v2.Filter[]} serverSideFilters
 * @returns {RegExp}
 */
function buildMutedRegex(serverSideFilters) {
    return (0, string_helpers_1.wordsRegex)(extractMutedKeywords(serverSideFilters));
}
exports.buildMutedRegex = buildMutedRegex;
;
/**
 * Extract all the muted keywords from server-side filters.
 * @memberof module:server_side_filters
 * @param {mastodon.v2.Filter[]} serverSideFilters
 * @returns {string[]}
 */
function extractMutedKeywords(serverSideFilters) {
    let keywords = serverSideFilters.map(f => f.keywords.map(k => k.keyword)).flat().flat().flat();
    keywords = keywords.map(k => k.toLowerCase().replace(/^#/, ""));
    // logger.trace(`<mutedKeywords()> found ${keywords.length} keywords:`, keywords);
    return keywords;
}
exports.extractMutedKeywords = extractMutedKeywords;
;
//# sourceMappingURL=filter.js.map