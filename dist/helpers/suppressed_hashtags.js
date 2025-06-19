"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.suppressedHashtags = void 0;
/*
 * Helper class to track hashtags that have been suppressed due to non-Latin script language.
 */
const collection_helpers_1 = require("./collection_helpers");
class SuppressedHashtags {
    hashtagCounts = {};
    wasLogged = false;
    increment(tag) {
        if (!tag.language)
            return;
        this.hashtagCounts[tag.language] ||= {};
        (0, collection_helpers_1.incrementCount)(this.hashtagCounts[tag.language], tag.name);
        this.wasLogged = false;
    }
    log(logger) {
        if (!Object.keys(this.hashtagCounts).length || this.wasLogged)
            return;
        const languageCounts = Object.values(this.hashtagCounts).map(counts => (0, collection_helpers_1.sumValues)(counts));
        logger.debug(`Suppressed ${(0, collection_helpers_1.sumArray)(languageCounts)} non-Latin hashtags:`, this.hashtagCounts);
    }
}
;
exports.suppressedHashtags = new SuppressedHashtags();
//# sourceMappingURL=suppressed_hashtags.js.map