/**
 * @module feed_scorers
 */
import FeedScorer from "../feed_scorer";
import type Toot from '../../api/objects/toot';
import { type StringNumberDict } from "../../types";
/**
 * Scores based on how many times each author or trending tag appears in the feed. Has a
 * negative weighting by default so that accounts that toot a lot don't dominate the feed.
 * @memberof module:toot_scorers
 * @augments Scorer
 */
export default class DiversityFeedScorer extends FeedScorer {
    description: string;
    constructor();
    /**
     * Compute a score for each {@linkcode Toot} in the feed based on how many times the {@linkcode Account}
     * has tooted and which trending tags it contains.
     *
     * @param {Toot[]} feed - The feed of toots to score.
     * @returns {StringNumberDict} Dictionary mapping toot URIs to their diversity scores.
     */
    extractScoringData(feed: Toot[]): StringNumberDict;
    _score(toot: Toot): Promise<number>;
    private computePenalty;
}
