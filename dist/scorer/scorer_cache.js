"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ScorerCache {
    // These can score a toot without knowing about the rest of the toots in the feed
    static featureScorers = [];
    // These scorers require the complete feed to work properly
    static feedScorers = [];
    // All scorers that can be weighted
    static weightedScorers = [];
    static addScorers(featureScorers, feedScorers) {
        this.featureScorers = featureScorers;
        this.feedScorers = feedScorers;
        this.weightedScorers = [...featureScorers, ...feedScorers];
    }
    static resetScorers() {
        this.weightedScorers.forEach(scorer => scorer.reset());
    }
}
exports.default = ScorerCache;
;
//# sourceMappingURL=scorer_cache.js.map