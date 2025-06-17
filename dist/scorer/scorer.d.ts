import Toot from '../api/objects/toot';
import { Logger } from '../helpers/logger';
import { ScoreName } from '../enums';
import { type StringNumberDict, type WeightInfo, type Weights } from "../types";
/**
 * Abstract base class for scoring Mastodon Toots.
 *
 * Scorer implementations provide algorithms for assigning scores to toots, which are used for ranking and filtering feeds.
 * This class manages scorer state, logging, and provides a public API for scoring, as well as static utilities for scoring arrays of toots.
 *
 * @abstract
 * @property {string} description - Description of the scoring algorithm.
 * @property {boolean} isReady - True if the scorer is ready to score toots.
 * @property {Logger} logger - Logger instance for this scorer.
 * @property {ScoreName} name - The name/key of this scorer.
 * @property {StringNumberDict} scoreData - Background data used to score a toot.
 */
export default abstract class Scorer {
    abstract description: string;
    isReady: boolean;
    logger: Logger;
    name: ScoreName;
    scoreData: StringNumberDict;
    /**
     * @param {ScoreName} name - The name/key of this scorer.
     */
    constructor(name: ScoreName);
    /**
     * Returns a WeightInfo object with the description of the scorer.
     * @returns {WeightInfo} The weight info for this scorer.
     */
    getInfo(): WeightInfo;
    /** Resets the scorer's state and score data. */
    reset(): void;
    /**
     * Public API for scoring a toot. Returns the score, or 0 if not ready.
     * @param {Toot} toot - The toot to score.
     * @returns {Promise<number>} The computed score for the toot.
     */
    score(toot: Toot): Promise<number>;
    /**
     * Actual implementation of the scoring algorithm. Must be implemented in subclasses.
     * @abstract
     * @param {Toot} _toot - The toot to score.
     * @returns {Promise<number>} The computed score for the toot.
     */
    abstract _score(_toot: Toot): Promise<number>;
    /**
     * Scores and returns an array of toots sorted by score (descending). Does NOT mutate the input array!
     * If you need the sorted array you need to use the return value.
     * @static
     * @param {Toot[]} toots - Array of toots to score.
     * @param {boolean} [isScoringFeed] - If true, refreshes feed scorer data and locks scoring.
     * @returns {Promise<Toot[]>} Array of scored and sorted toots.
     */
    static scoreToots(toots: Toot[], isScoringFeed?: boolean): Promise<Toot[]>;
    /**
     * Validates that the weights object contains valid weight names and values.
     * Throws an error if any weight is invalid or missing.
     *
     * @static
     * @param {Weights} weights - Weights object to validate.
     * @throws {Error} If any weight is invalid or missing.
     */
    static validateWeights(weights: Weights): void;
    /**
     * Adds all score info to a Toot's scoreInfo property.
     * @private
     * @static
     * @param {Toot} toot - The toot to decorate.
     * @param {Scorer[]} scorers - Array of scorer instances.
     * @returns {Promise<void>}
     */
    private static decorateWithScoreInfo;
    /**
     * Sums the scores of all scorers for a given score type, +1 so that time decay multiplier
     * works even with scorers giving 0s.
     * @private
     * @static
     * @param {TootScores} scores - The scores object.
     * @param {ScoreType} scoreType - The type of score to sum ("raw" or "weighted").
     * @returns {number} The sum of the scores plus 1.
     */
    private static sumScores;
}
