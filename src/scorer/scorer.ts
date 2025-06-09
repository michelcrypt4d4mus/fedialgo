/*
 * Base class for Toot scorers.
 */
import { E_CANCELED, Mutex, MutexInterface } from 'async-mutex';

import ScorerCache from './scorer_cache';
import Storage from "../Storage";
import Toot from '../api/objects/toot';
import { ageString } from '../helpers/time_helpers';
import { batchMap, sumArray } from "../helpers/collection_helpers";
import { config } from '../config';
import { DEFAULT_WEIGHTS } from "./weight_presets";
import { Logger } from '../helpers/logger';
import { ScoreName, NonScoreWeightName } from '../enums';
import {
    type StringNumberDict,
    type TootScore,
    type TootScores,
    type WeightedScore,
    type WeightInfo,
    type WeightName,
} from "../types";

// Local constants
const LOG_PREFIX = "Scorer";
const SCORE_MUTEX = new Mutex();

const TRENDING_WEIGHTS = [
    ScoreName.TRENDING_LINKS,
    ScoreName.TRENDING_TAGS,
    ScoreName.TRENDING_TOOTS,
];

const scoreLogger = new Logger(LOG_PREFIX, "scoreToots");


export default abstract class Scorer {
    abstract description: string;

    isReady: boolean = false;  // Set to true when the scorer is ready to score
    logger: Logger;
    name: ScoreName;
    scoreData: StringNumberDict = {};  // Background data used to score a toot

    constructor(name: ScoreName) {
        this.name = name;
        this.logger = new Logger(LOG_PREFIX, name);
    }

    // Return a ScorerInfo object with the description and the scorer itself
    getInfo(): WeightInfo {
        return {
            description: this.description,
            scorer: this,
        };
    }

    reset(): void {
        this.isReady = false;
        this.scoreData = {};
        this.logger.debug(`Reset scorer`);
    }

    // This is the public API for scoring a toot
    async score(toot: Toot): Promise<number> {
        if (this.isReady) return await this._score(toot);

        if (!toot.scoreInfo) {
            this.logger.trace(`Not ready, scoring 0...`);
            return 0;
        } else {
            const existingScore = toot.getIndividualScore("raw", this.name);
            this.logger.trace(`Not ready but toot already scored (existing score: ${existingScore})`);
            return existingScore;
        }
    }

    // Actual implementation of the scoring algorithm should be implemented in subclasses
    abstract _score(_toot: Toot): Promise<number>;

    //////////////////////////////
    //   Static class methods   //
    //////////////////////////////

    // Score and return an array of toots sorted by score. This DOES NOT mutate the order of
    // 'toots' array in place - if you need the sorted array you need to assign the return value.
    // If 'isScoringFeed' is false the scores will be "best effort"
    static async scoreToots(toots: Toot[], isScoringFeed?: boolean): Promise<Toot[]> {
        const scorers = ScorerCache.weightedScorers;
        const startedAt = new Date();

        try {
            // Lock mutex to prevent multiple scoring loops calling DiversityFeedScorer simultaneously.
            // If it's already locked just cancel the current loop and start over (scoring is idempotent so it's OK).
            // Makes the feed scoring more responsive to the user adjusting the weights to not have to wait.
            let releaseMutex: MutexInterface.Releaser | undefined;

            if (isScoringFeed) {
                SCORE_MUTEX.cancel();
                releaseMutex = await SCORE_MUTEX.acquire();
                // Feed scorers' data must be refreshed each time the feed changes
                ScorerCache.feedScorers.forEach(scorer => scorer.extractScoreDataFromFeed(toots));
            }

            try {  // Score the toots asynchronously in batches
                await batchMap(toots, t => this.decorateWithScoreInfo(t, scorers), {logger: scoreLogger});
            } finally {
                releaseMutex?.();
            }

            // Sort feed based on score from high to low and return
            scoreLogger.trace(`Scored ${toots.length} toots ${ageString(startedAt)} (${scorers.length} scorers)`);
            toots = toots.toSorted((a, b) => b.getScore() - a.getScore());
        } catch (e) {
            if (e == E_CANCELED) {
                scoreLogger.trace(`Mutex cancellation...`);
            } else {
                scoreLogger.warn(`Caught error:`, e);
            }
        }

        return toots;
    }

    ////////////////////////////////
    //   Private static methods   //
    ////////////////////////////////

    // Add all the score info to a Toot's scoreInfo property
    private static async decorateWithScoreInfo(toot: Toot, scorers: Scorer[]): Promise<void> {
        const realToot = toot.realToot;
        // Do the scoring
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
                if (TRENDING_WEIGHTS.includes(scorer.name)) {
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

    // Add 1 so that time decay multiplier works even with scorers giving 0s
    private static sumScores(scores: TootScores, scoreType: keyof WeightedScore): number {
        return 1 + sumArray(Object.values(scores).map((s) => s[scoreType]));
    }
};
