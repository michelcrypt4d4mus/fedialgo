/*
 * Exists to avoid circular dependencies so Scorer can access the weights in TheAlgorithm instance.
 * Note there are many nasty circular dependencies if you try to import stuff into this file.
 */
import { Mutex } from "async-mutex";

import FeedScorer from "./feed_scorer";
import TootScorer from "./feature_scorer";
import { ageString } from "../helpers/time_helpers";

const SCORERS_MUTEX = new Mutex();


export default class ScorerCache {
    // These scorers require the complete feed to work properly
    static feedScorers: FeedScorer[] = [];
    // These can score a toot without knowing about the rest of the toots in the feed
    static tootScorers: TootScorer[] = [];
    // All scorers that can be weighted
    static weightedScorers: (FeedScorer | TootScorer)[] = [];

    static addScorers(tootScorers: TootScorer[], feedScorers: FeedScorer[]) {
        this.feedScorers = feedScorers;
        this.tootScorers = tootScorers;
        this.weightedScorers = [...tootScorers, ...feedScorers];
    }

    // Prepare the scorers for scoring. If 'force' is true, force recompute of scoringData.
    static async prepareScorers(force?: boolean): Promise<void> {
        const startedAt = new Date();
        const releaseMutex = await SCORERS_MUTEX.acquire();

        try {
            const scorersToPrepare = this.tootScorers.filter(scorer => force || !scorer.isReady);
            if (scorersToPrepare.length == 0) return;
            await Promise.all(scorersToPrepare.map(scorer => scorer.fetchRequiredData()));
            console.log(`[ScorerCache] ${this.tootScorers.length} scorers ready ${ageString(startedAt)}`);
        } finally {
            releaseMutex();
        }
    }

    static resetScorers() {
        this.weightedScorers.forEach(scorer => scorer.reset());
    }
};
