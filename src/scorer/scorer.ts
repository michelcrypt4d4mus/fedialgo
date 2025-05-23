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
import { traceLog } from '../helpers/log_helpers';
import {
    NonScoreWeightName,
    ScoreName,
    StringNumberDict,
    TootScore,
    TootScores,
    WeightedScore,
    WeightInfo,
    WeightName
} from "../types";

const LOG_PREFIX = "scoreToots()";
const SCORE_MUTEX = new Mutex();

const TRENDING_WEIGHTS = [
    ScoreName.TRENDING_LINKS,
    ScoreName.TRENDING_TAGS,
    ScoreName.TRENDING_TOOTS,
];


export default abstract class Scorer {
    abstract description: string;

    isReady: boolean = false;  // Set to true when the scorer is ready to score
    name: ScoreName;
    scoreData: StringNumberDict = {};  // Background data used to score a toot

    constructor(name: ScoreName) {
        this.name = name;
    }

    // Return a ScorerInfo object with the description and the scorer itself
    getInfo(): WeightInfo {
        return {
            description: this.description,
            scorer: this,
        };
    }

    // This is the public API for scoring a toot
    async score(toot: Toot): Promise<number> {
        if (this.isReady) return await this._score(toot);

        if (!toot.scoreInfo) {
            console.warn(`${this.logPrefix()} not ready, scoring 0...`);
            return 0;
        } else {
            const existingScore = toot.getIndividualScore("raw", this.name);
            console.debug(`${this.logPrefix()} Not ready but toot already scored (existing score: ${existingScore})`);
            return existingScore;
        }
    }

    // Actual implementation of the scoring algorithm should be implemented in subclasses
    abstract _score(_toot: Toot): Promise<number>;

    // Logging helper
    protected logPrefix(): string {
        return `[${this.name} Scorer]`;
    }

    //////////////////////////////
    //   Static class methods   //
    //////////////////////////////

    // Score and sort the toots. This DOES NOT mutate the order of 'toots' array in place
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

            try {
                // Score the toots asynchronously in batches
                await batchMap<Toot>(toots, (t) => this.decorateWithScoreInfo(t, scorers), "Scorer");
            } finally {
                releaseMutex?.();
            }

            // Sort feed based on score from high to low and return
            traceLog(LOG_PREFIX, `scored ${toots.length} toots ${ageString(startedAt)} (${scorers.length} scorers)`);
            toots = toots.toSorted((a, b) => b.getScore() - a.getScore());
        } catch (e) {
            if (e == E_CANCELED) {
                traceLog(LOG_PREFIX, `mutex cancellation`);
            } else {
                console.warn(`${LOG_PREFIX} caught error:`, e);
            }
        }

        return toots;
    }

    ///////////////////////////////
    //   Private class methods   //
    ///////////////////////////////

    // Add all the score info to a Toot's scoreInfo property
    private static async decorateWithScoreInfo(toot: Toot, scorers: Scorer[]): Promise<void> {
        const realToot = toot.realToot();
        const userWeights = await Storage.getWeights();
        // Find non scorer weights
        const getWeight = (weightKey: WeightName) => userWeights[weightKey] ?? DEFAULT_WEIGHTS[weightKey];
        const outlierDampener = getWeight(NonScoreWeightName.OUTLIER_DAMPENER);
        const timeDecayWeight = getWeight(NonScoreWeightName.TIME_DECAY) / 10;  // Divide by 10 to make it more user friendly
        const trendingMultiplier = getWeight(NonScoreWeightName.TRENDING);
        // Do scoring
        const rawestScores = await Promise.all(scorers.map((s) => s.score(toot)));

        // Compute a weighted score a toot based by multiplying the value of each numerical property
        // by the user's chosen weighting for that property (the one configured with the GUI sliders).
        const scores: TootScores = scorers.reduce(
            (scoreDict, scorer, i) => {
                const rawScore = rawestScores[i] || 0;
                let weightedScore = rawScore * (userWeights[scorer.name] ?? 0);

                // Apply the TRENDING modifier but only to toots that are not from followed accounts or tags
                if (realToot.isTrending() && (!realToot.isFollowed() || TRENDING_WEIGHTS.includes(scorer.name))) {
                    weightedScore *= trendingMultiplier;
                }

                // Outlier dampener of 2 means take the square root of the score, 3 means cube root, etc.
                // TODO: outlierDampener is always greater than 0...
                if (outlierDampener > 0) {
                    const scorerScore = weightedScore;

                    // Diversity scores are negative so we temporarily flip the sign to get the root
                    if (scorerScore >= 0) {
                        weightedScore = Math.pow(scorerScore, 1 / outlierDampener);
                    } else {
                        weightedScore = -1 * Math.pow(-1 * scorerScore, 1 / outlierDampener);
                    }
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
        const decayExponent = -1 * Math.pow(toot.ageInHours(), config.scoring.timeDecayExponent);
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

        // TODO: duping the score to realToot() is a hack that sucks
        toot.realToot().scoreInfo = toot.scoreInfo = scoreInfo;
    }

    // Add 1 so that time decay multiplier works even with scorers giving 0s
    private static sumScores(scores: TootScores, scoreType: keyof WeightedScore): number {
        return 1 + sumArray(Object.values(scores).map((s) => s[scoreType]));
    }
};
