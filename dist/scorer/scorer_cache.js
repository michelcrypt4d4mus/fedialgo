"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Exists to avoid circular dependencies so Scorer can access the weights in TheAlgorithm instance.
 * Note there are many nasty circular dependencies if you try to import stuff into this file.
 */
const async_mutex_1 = require("async-mutex");
const time_helpers_1 = require("../helpers/time_helpers");
const SCORERS_MUTEX = new async_mutex_1.Mutex();
class ScorerCache {
    // These scorers require the complete feed to work properly
    static feedScorers = [];
    // These can score a toot without knowing about the rest of the toots in the feed
    static tootScorers = [];
    // All scorers that can be weighted
    static weightedScorers = [];
    static addScorers(tootScorers, feedScorers) {
        this.feedScorers = feedScorers;
        this.tootScorers = tootScorers;
        this.weightedScorers = [...tootScorers, ...feedScorers];
    }
    // Prepare the scorers for scoring. If 'force' is true, force recompute of scoringData.
    static async prepareScorers(force) {
        const startedAt = new Date();
        const releaseMutex = await SCORERS_MUTEX.acquire();
        try {
            const scorersToPrepare = this.tootScorers.filter(scorer => force || !scorer.isReady);
            if (scorersToPrepare.length == 0)
                return;
            await Promise.all(scorersToPrepare.map(scorer => scorer.fetchRequiredData()));
            console.log(`[ScorerCache] ${this.tootScorers.length} scorers ready ${(0, time_helpers_1.ageString)(startedAt)}`);
        }
        finally {
            releaseMutex();
        }
    }
    static resetScorers() {
        this.weightedScorers.forEach(scorer => scorer.reset());
    }
}
exports.default = ScorerCache;
;
//# sourceMappingURL=scorer_cache.js.map