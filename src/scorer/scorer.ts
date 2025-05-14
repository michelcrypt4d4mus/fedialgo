/*
 * Base class for Toot scorers.
 */
import { E_CANCELED, Mutex, MutexInterface } from 'async-mutex';

import ScorerCache from './scorer_cache';
import Storage from "../Storage";
import Toot from '../api/objects/toot';
import { ageString } from '../helpers/time_helpers';
import { batchMap, sumValues } from "../helpers/collection_helpers";
import { Config, SCORERS_CONFIG } from '../config';
import { DEFAULT_WEIGHTS } from "./weight_presets";
import { logAndThrowError, logDebug, logInfo, traceLog } from '../helpers/log_helpers';
import { TRENDING_WEIGHTS, WeightInfo, StringNumberDict, TootScore, WeightName, Weights } from "../types";

const SCORE_DIGITS = 3;  // Number of digits to display in the alternate score
const SCORE_MUTEX = new Mutex();
const SCORE_PREFIX = "scoreToots()";

type ScoreDisplayDict = Record<string, number | StringNumberDict>;
type AlternateScoreDict = Record<string, number | ScoreDisplayDict>;


export default abstract class Scorer {
    defaultWeight: number;
    description: string;
    isReady: boolean = false;  // Set to true when the scorer is ready to score
    name: WeightName;
    scoreData: StringNumberDict = {};  // Background data used to score a toot

    constructor(name: WeightName) {
        this.name = name;
        this.description = SCORERS_CONFIG[name].description;
        this.defaultWeight = DEFAULT_WEIGHTS[name] ?? 1;
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
            const existingScore = toot.scoreInfo.rawScores[this.name];
            console.debug(`${this.logPrefix()} Not ready but toot already scored (existing score: ${existingScore})`);
            return existingScore;
        }
    }

    // Actual implementation of the scoring algorithm should be implemented in subclasses
    abstract _score(_toot: Toot): Promise<number>;

    // Logging helper
    protected logPrefix(): string {
        return `[${this.constructor.name}]`;
    }

    // Throw an error if the scorer is not ready to score
    private checkIsReady(): void {
        if (!this.isReady) logAndThrowError(`${this.name} scorer not ready!`);
    }

    ///////////////////////////////
    //   Static class methods  ////
    ///////////////////////////////

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
            logDebug(SCORE_PREFIX, `scored ${toots.length} toots ${ageString(startedAt)} (${scorers.length} scorers)`);
            toots = toots.toSorted((a, b) => b.getScore() - a.getScore());
        } catch (e) {
            if (e == E_CANCELED) {
                logDebug(SCORE_PREFIX, `mutex cancellation`);
            } else {
                console.warn(`${SCORE_PREFIX} caught error:`, e);
            }
        }

        return toots;
    }

    // Return a scoreInfo dict in a different format for the GUI (raw & weighted scores grouped in a subdict)
    static alternateScoreInfo(toot: Toot): AlternateScoreDict {
        if (!toot.scoreInfo) return {};

        return Object.entries(toot.scoreInfo).reduce(
            (scoreDict, [key, value]) => {
                if (key == "rawScores") {
                    scoreDict["scores"] = Object.entries(value).reduce(
                        (scoreDetails, [scoreKey, scoreValue]) => {
                            const weightedScore = toot.scoreInfo!.weightedScores[scoreKey as WeightName];

                            if (scoreValue == 0) {
                                scoreDetails[scoreKey] = 0;
                            } else if (scoreValue == weightedScore) {
                                scoreDetails[scoreKey] = toScoreFmt(scoreValue);
                            } else {
                                scoreDetails[scoreKey] = {
                                    unweighted: toScoreFmt(scoreValue),
                                    weighted: toScoreFmt(weightedScore),
                                };
                            }

                            return scoreDetails;
                        },
                        {} as ScoreDisplayDict
                    );
                } else if (key != "weightedScores") {
                    scoreDict[key] = value as number;
                }

                return scoreDict;
            },
            {} as AlternateScoreDict
        );
    }

    // Add all the score info to a Toot's scoreInfo property
    private static async decorateWithScoreInfo(toot: Toot, scorers: Scorer[]): Promise<void> {
        // Find non scorer weights
        const userWeights = await Storage.getWeights();
        const getWeight = (weightKey: WeightName) => userWeights[weightKey] ?? DEFAULT_WEIGHTS[weightKey];
        const outlierDampener = getWeight(WeightName.OUTLIER_DAMPENER);
        const timeDecayWeight = getWeight(WeightName.TIME_DECAY) / 10;  // Divide by 10 to make it more user friendly
        const trendingMultiplier = getWeight(WeightName.TRENDING);
        // Initialize variables
        const realToot = toot.realToot();
        const rawScores = {} as StringNumberDict;
        const weightedScores = {} as StringNumberDict;
        // Do scoring
        const scores = await Promise.all(scorers.map((s) => s.score(toot)));

        // Compute a weighted score a toot based by multiplying the value of each numerical property
        // by the user's chosen weighting for that property (the one configured with the GUI sliders).
        scorers.forEach((scorer, i) => {
            const scoreValue = scores[i] || 0;
            rawScores[scorer.name] = scoreValue;
            weightedScores[scorer.name] = scoreValue * (userWeights[scorer.name] ?? 0);

            // Apply the TRENDING modifier but only to toots that are not from followed accounts or tags
            if (realToot.isTrending() && (!realToot.isFollowed() || TRENDING_WEIGHTS.includes(scorer.name))) {
                weightedScores[scorer.name] *= trendingMultiplier;
            }

            // Outlier dampener of 2 means take the square root of the score, 3 means cube root, etc.
            if (outlierDampener > 0) {
                const scorerScore = weightedScores[scorer.name];

                // Diversity scores are negative so we temporarily flip the sign to get the root
                if (scorerScore >= 0) {
                    weightedScores[scorer.name] = Math.pow(scorerScore, 1 / outlierDampener);
                } else {
                    weightedScores[scorer.name] = -1 * Math.pow(-1 * scorerScore, 1 / outlierDampener);
                }
            }
        });

        // Multiple weighted score by time decay penalty to get a final weightedScore
        const decayExponent = -1 * Math.pow(toot.ageInHours(), Config.timelineDecayExponent);
        const timeDecayMultiplier = Math.pow(timeDecayWeight + 1, decayExponent);
        const weightedScore = this.sumScores(weightedScores);
        const score = weightedScore * timeDecayMultiplier;

        // Preserve rawScores, timeDecayMultiplier, and weightedScores for debugging
        const scoreInfo = {
            rawScore: this.sumScores(rawScores),
            rawScores,
            score,
            timeDecayMultiplier,
            trendingMultiplier,
            weightedScores,
            weightedScore,
        } as TootScore;

        // TODO: duping the score to realToot() is a hack that sucks
        toot.realToot().scoreInfo = toot.scoreInfo = scoreInfo;
    }

    // Add 1 so that time decay multiplier works even with scorers giving 0s
    private static sumScores(scores: StringNumberDict | Weights): number {
        return 1 + sumValues(scores);
    }
};


function toScoreFmt(score: number): number {
    if (score < Math.pow(10, -1 * SCORE_DIGITS)) return score;
    return Number(score.toPrecision(SCORE_DIGITS));
};
