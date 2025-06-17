/*
 * Base class for Toot scorers.
 */
import { E_CANCELED, Mutex, MutexInterface } from 'async-mutex';
import { isFinite } from 'lodash';

import ScorerCache from './scorer_cache';
import Storage from "../Storage";
import Toot from '../api/objects/toot';
import { ageString } from '../helpers/time_helpers';
import { batchMap, sumArray } from "../helpers/collection_helpers";
import { config } from '../config';
import { DEFAULT_WEIGHTS } from "./weight_presets";
import { Logger } from '../helpers/logger';
import { NonScoreWeightName, ScoreName, isNonScoreWeightName, isWeightName } from '../enums';
import {
    type ScoreType,
    type StringNumberDict,
    type TootScore,
    type TootScores,
    type WeightInfo,
    type WeightName,
    type Weights,
} from "../types";

// Local constants
const LOG_PREFIX = "Scorer";
const SCORE_MUTEX = new Mutex();

const TRENDING_WEIGHTS = new Set([
    ScoreName.TRENDING_LINKS,
    ScoreName.TRENDING_TAGS,
    ScoreName.TRENDING_TOOTS,
]);

const scoreLogger = new Logger(LOG_PREFIX, "scoreToots");

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

    isReady: boolean = false;  // Set to true when the scorer is ready to score
    logger: Logger;
    name: ScoreName;
    scoreData: StringNumberDict = {};  // Background data used to score a toot

    /**
     * @param {ScoreName} name - The name/key of this scorer.
     */
    constructor(name: ScoreName) {
        this.name = name;
        this.logger = new Logger(LOG_PREFIX, name);
    }

    /**
     * Returns a WeightInfo object with the description of the scorer.
     * @returns {WeightInfo} The weight info for this scorer.
     */
    getInfo(): WeightInfo {
        return {description: this.description};
    }

    /** Resets the scorer's state and score data. */
    reset(): void {
        this.isReady = false;
        this.scoreData = {};
        this.logger.debug(`Reset scorer`);
    }

    /**
     * Public API for scoring a toot. Returns the score, or 0 if not ready.
     * @param {Toot} toot - The toot to score.
     * @returns {Promise<number>} The computed score for the toot.
     */
    async score(toot: Toot): Promise<number> {
        if (this.isReady) {
            return await this._score(toot);
        } else if (toot.scoreInfo) {
            const existingScore = toot.getIndividualScore("raw", this.name);
            this.logger.deep(`Not ready but toot already scored ${existingScore}`);
            return existingScore;
        } else {
            this.logger.deep(`Not ready and no existing scoreInfo, scoring 0...`);
            return 0;
        }
    }

    /**
     * Actual implementation of the scoring algorithm. Must be implemented in subclasses.
     * @abstract
     * @param {Toot} _toot - The toot to score.
     * @returns {Promise<number>} The computed score for the toot.
     */
    abstract _score(_toot: Toot): Promise<number>;

    //////////////////////////////
    //   Static class methods   //
    //////////////////////////////

    /**
     * Scores and returns an array of toots sorted by score (descending). Does NOT mutate the input array!
     * If you need the sorted array you need to use the return value.
     * @static
     * @param {Toot[]} toots - Array of toots to score.
     * @param {boolean} [isScoringFeed] - If true, refreshes feed scorer data and locks scoring.
     * @returns {Promise<Toot[]>} Array of scored and sorted toots.
     */
    static async scoreToots(toots: Toot[], isScoringFeed?: boolean): Promise<Toot[]> {
        const scorers = ScorerCache.weightedScorers;
        const startedAt = new Date();

        try {
            let releaseMutex: MutexInterface.Releaser | undefined;

            // Feed scorers' data must be refreshed each time the main timeline feed changes so we half heartedly
            // lock mutex to prevent multiple scoring loops calling DiversityFeedScorer simultaneously.
            // If it's already locked just cancel the current loop and start over (scoring is idempotent so it's OK).
            // Makes the feed scoring more responsive to the user adjusting the weights (less waiting).
            if (isScoringFeed) {
                SCORE_MUTEX.cancel();
                releaseMutex = await SCORE_MUTEX.acquire();
                ScorerCache.feedScorers.forEach(scorer => scorer.extractScoreDataFromFeed(toots));
            }

            try {  // Score the toots asynchronously in batches
                await batchMap(toots, t => this.decorateWithScoreInfo(t, scorers), {logger: scoreLogger});
            } finally {
                releaseMutex?.();
            }

            // Sort feed based on score from high to low and return
            scoreLogger.trace(`Scored ${toots.length} toots ${ageString(startedAt)} (${scorers.length} scorers)`);
            toots = toots.toSorted((a, b) => b.score - a.score);
        } catch (e) {
            if (e == E_CANCELED) {
                scoreLogger.trace(`Mutex cancellation...`);
            } else {
                scoreLogger.warn(`Caught error:`, e);
            }
        }

        return toots;
    }

    /**
     * Validates that the weights object contains valid weight names and values.
     * Throws an error if any weight is invalid or missing.
     *
     * @static
     * @param {Weights} weights - Weights object to validate.
     * @throws {Error} If any weight is invalid or missing.
     */
    static validateWeights(weights: Weights) {
        Object.entries(weights).forEach(([weightName, value]) => {
            if (!isWeightName(weightName)) throw new Error(`Invalid weight name: ${weightName}`);
            if (!isFinite(value)) throw new Error(`Weight ${weightName} is missing from weights object!`);

            if (isNonScoreWeightName(weightName) && weightName != NonScoreWeightName.TRENDING && value <= 0) {
                throw new Error(`Non-score weight ${weightName} must be greater than 0!`);
            }
        });
    }

    ////////////////////////////////
    //   Private static methods   //
    ////////////////////////////////

    /**
     * Adds all score info to a Toot's scoreInfo property.
     * @private
     * @static
     * @param {Toot} toot - The toot to decorate.
     * @param {Scorer[]} scorers - Array of scorer instances.
     * @returns {Promise<void>}
     */
    private static async decorateWithScoreInfo(toot: Toot, scorers: Scorer[]): Promise<void> {
        const rawestScores = await Promise.all(scorers.map((s) => s.score(toot)));

        // Find non scorer weights
        const userWeights = await Storage.getWeights();
        const getWeight = (weightKey: WeightName) => userWeights[weightKey] ?? DEFAULT_WEIGHTS[weightKey];
        const timeDecayWeight = getWeight(NonScoreWeightName.TIME_DECAY) / 10;  // Divide by 10 to make it more user friendly
        const trendingMultiplier = getWeight(NonScoreWeightName.TRENDING);
        let outlierDampener = getWeight(NonScoreWeightName.OUTLIER_DAMPENER);

        if (outlierDampener <= 0) {
            scoreLogger.warn(`Outlier dampener is ${outlierDampener} but should not be less than 0! Using 1 instead.`);
            outlierDampener = 1;  // Prevent division by zero
        }

        // Compute a weighted score a toot based by multiplying the value of each numerical property
        // by the user's chosen weighting for that property (the one configured with the GUI sliders).
        const scores: TootScores = scorers.reduce(
            (scoreDict, scorer, i) => {
                const rawScore = rawestScores[i] || 0;
                const outlierExponent = 1 / outlierDampener;
                let weightedScore = rawScore * (userWeights[scorer.name] ?? 0);

                // Apply the TRENDING modifier
                if (TRENDING_WEIGHTS.has(scorer.name)) {
                    weightedScore *= trendingMultiplier;
                }

                // Outlier dampener of 2 means take the square root of the score, 3 means cube root, etc.
                if (weightedScore >= 0) {
                    weightedScore = Math.pow(weightedScore, outlierExponent);
                } else {
                    weightedScore = -1 * Math.pow(-1 * weightedScore, outlierExponent);
                }

                scoreDict[scorer.name] = {
                    raw: rawScore,
                    weighted: weightedScore,
                }

                return scoreDict;
            },
            {} as TootScores
        );

        // Multiple weighted score by time decay penalty to get a final weightedScore
        const decayExponent = -1 * Math.pow(toot.ageInHours, config.scoring.timeDecayExponent);
        const timeDecayMultiplier = Math.pow(timeDecayWeight + 1, decayExponent);
        const weightedScore = this.sumScores(scores, "weighted");
        const score = weightedScore * timeDecayMultiplier;

        // Preserve rawScores, timeDecayMultiplier, and weightedScores for debugging
        const scoreInfo = {
            rawScore: this.sumScores(scores, "raw"),
            score,
            scores,
            timeDecayMultiplier,
            trendingMultiplier,
            weightedScore,
        } as TootScore;

        // TODO: duping the score to realToot is a hack that sucks
        toot.realToot.scoreInfo = toot.scoreInfo = scoreInfo;
    }

    /**
     * Sums the scores of all scorers for a given score type, +1 so that time decay multiplier
     * works even with scorers giving 0s.
     * @private
     * @static
     * @param {TootScores} scores - The scores object.
     * @param {ScoreType} scoreType - The type of score to sum ("raw" or "weighted").
     * @returns {number} The sum of the scores plus 1.
     */
    private static sumScores(scores: TootScores, scoreType: ScoreType): number {
        return 1 + sumArray(Object.values(scores).map((s) => s[scoreType]));
    }
};
