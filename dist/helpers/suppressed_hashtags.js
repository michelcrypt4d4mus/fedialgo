"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.suppressedHashtags = void 0;
const collection_helpers_1 = require("./collection_helpers");
/**
 * Helper class to track hashtags that have been suppressed due to non-Latin script language.
 * @property {TagLanguageToots} languageTagURIs - Mapping of language codes to tag names to sets of Toot URIs.
 * @property {number} lastLoggedCount - The last total count of suppressed hashtags that was logged.
 */
class SuppressedHashtags {
    languageTagURIs = {};
    lastLoggedCount = 0;
    /**
     * Increment the count for a given tag and toot.
     * @param {TagWithUsageCounts} tag
     * @param {Toot} toot
     */
    increment(tag, toot) {
        if (!tag.language)
            return;
        this.languageTagURIs[tag.language] ??= {};
        this.languageTagURIs[tag.language][tag.name] ??= new Set();
        this.languageTagURIs[tag.language][tag.name].add(toot.realURI);
    }
    /**
     * Log the number of suppressed hashtags by language and tag.
     * @param {Logger} logger - Logger instance to use for logging.
     */
    log(logger) {
        const numLanguages = Object.keys(this.languageTagURIs).length;
        const totalCount = (0, collection_helpers_1.sumValues)(this.languageCounts());
        if (totalCount === this.lastLoggedCount) {
            return; // No change since last log
        }
        logger.debug(`Suppressed ${totalCount} non-Latin hashtags in ${numLanguages} languages on ${this.allTootURIs().size} toots:`, this.tagLanguageCounts());
        this.lastLoggedCount = totalCount;
    }
    /** Set of all {@linkcode Toot} URIs that had a suppressed tag. */
    allTootURIs() {
        return Object.values(this.languageTagURIs).reduce((uris, tagTootURIs) => {
            Object.values(tagTootURIs).forEach(set => uris = new Set([...uris, ...set]));
            return uris;
        }, new Set());
    }
    /** Count of tag {@linkcode Toot}s per language. */
    languageCounts() {
        return Object.entries(this.tagLanguageCounts()).reduce((counts, [language, tagCounts]) => {
            counts[language] = (0, collection_helpers_1.sumValues)(tagCounts);
            return counts;
        }, {});
    }
    /** Count of tag {@linkcode Toot}s per language / tag. */
    tagLanguageCounts() {
        return Object.entries(this.languageTagURIs).reduce((langTagCounts, [language, tootURIs]) => {
            langTagCounts[language] = this.uriCounts(tootURIs);
            return langTagCounts;
        }, {});
    }
    /**
     * Convert a {@linkcode TagTootUris} object to a {@linkcode StringNumberDict} w/length
     * of each URI string {@linkcode Set}.
     * @private
     * @param {TagTootUris} tootURIs - Mapping of tag names to sets of Toot URIs.
     * @returns {StringNumberDict} Mapping of tag names to counts of Toot URIs.
     */
    uriCounts(tootURIs) {
        return Object.entries(tootURIs).reduce((acc, [tag, uris]) => {
            acc[tag] = uris.size;
            return acc;
        }, {});
    }
}
;
exports.suppressedHashtags = new SuppressedHashtags();
//# sourceMappingURL=suppressed_hashtags.js.map