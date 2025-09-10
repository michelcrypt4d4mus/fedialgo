import type FeedScorer from "./feed_scorer";
import type Scorer from "./scorer";
import type TootScorer from "./toot_scorer";
/**
 * Class that exists to avoid circular dependencies so Scorer can access the weights in
 * {@linkcode TheAlgorithm} instance.
 */
export default class ScorerCache {
    static feedScorers: FeedScorer[];
    static tootScorers: TootScorer[];
    static weightedScorers: Scorer[];
    static addScorers(tootScorers: TootScorer[], feedScorers: FeedScorer[]): void;
    /**
     * Prepare the {@linkcode Scorer}s for scoring. If {@linkcode force} is true force recompute of
     * all {@linkcode Scorer}'s {@linkcode scoringData} dictionaries.
     * @param {boolean} [force] - Whether to force recompute of {@linkcode Scorer.scoringData}.
     */
    static prepareScorers(force?: boolean): Promise<void>;
    /** Reset all the {@linkcode Scorer}'s internal state. */
    static resetScorers(): void;
}
