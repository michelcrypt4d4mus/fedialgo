"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.suppressedHashtags = void 0;
const collection_helpers_1 = require("./collection_helpers");
class SuppressedHashtags {
    languageTagURIs = {};
    lastLoggedCount = 0;
    increment(tag, toot) {
        if (!tag.language)
            return;
        this.languageTagURIs[tag.language] ??= {};
        this.languageTagURIs[tag.language][tag.name] ??= new Set();
        this.languageTagURIs[tag.language][tag.name].add(toot.realURI);
    }
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
    /** Convert a TagTootUris object to a StringNumberDict w/length of each URI string Set. */
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