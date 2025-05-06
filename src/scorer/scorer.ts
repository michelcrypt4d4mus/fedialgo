/*
 * Base class for Toot scorers.
 */
import { E_CANCELED, Mutex } from 'async-mutex';

import FeatureScorer from './feature_scorer';
import FeedScorer from './feed_scorer';
import Storage from "../Storage";
import Toot from '../api/objects/toot';
import { ageString } from '../helpers/time_helpers';
import { batchMap, sumValues } from "../helpers/collection_helpers";
import { Config, SCORERS_CONFIG } from '../config';
import { DEFAULT_WEIGHTS } from "./weight_presets";
import { logAndThrowError, traceLog } from '../helpers/log_helpers';
import { ScorerInfo, StringNumberDict, TootScore, WeightName, Weights } from "../types";

const SCORE_DIGITS = 3;  // Number of digits to display in the alternate score
const SCORE_MUTEX = new Mutex();
const SCORE_PREFIX = "[scoreToots()]";
type ScoreDisplayDict = Record<string, number | StringNumberDict>;


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
    getInfo(): ScorerInfo {
        return {
            description: this.description,
            scorer: this,
        };
    }

    // This is the public API for scoring a toot
    async score(toot: Toot): Promise<number> {
        this.checkIsReady();
        return await this._score(toot);
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
    static async scoreToots(
        toots: Toot[],
        featureScorers: FeatureScorer[],
        feedScorers: FeedScorer[]
    ): Promise<Toot[]> {
        const scorers = [...featureScorers, ...feedScorers];
        traceLog(`${SCORE_PREFIX} Scoring ${toots.length} toots with ${scorers.length} scorers...`);
        const startedAt = new Date();

        try {
            // Lock a mutex to prevent multiple scoring loops to call the DiversityFeedScorer simultaneously
            // If the mutex is already locked just cancel the current scoring loop and start over
            // (scoring is idempotent, so this is safe).
            // Tnis done to make the feed more immediately responsive to the user adjusting the weights -
            // rather than waiting for a rescore to finish we just cancel it and start over.
            SCORE_MUTEX.cancel()
            const releaseMutex = await SCORE_MUTEX.acquire();

            try {
                // Feed scorers' data must be refreshed each time the feed changes
                feedScorers.forEach(scorer => scorer.extractScoreDataFromFeed(toots));
                // Score the toots asynchronously in batches
                await batchMap<Toot>(toots, (t) => this.decorateWithScoreInfo(t, scorers), "Scorer");
                // Sort feed based on score from high to low.
                toots = toots.toSorted((a, b) => (b.scoreInfo?.score ?? 0) - (a.scoreInfo?.score ?? 0));
            } finally {
                releaseMutex();
            }
        } catch (e) {
            if (e == E_CANCELED) {
                console.debug(`${SCORE_PREFIX} mutex cancellation`);
            } else {
                console.warn(`${SCORE_PREFIX} caught error:`, e);
            }
        }

        console.debug(`${SCORE_PREFIX} scored ${toots.length} toots in ${ageString(startedAt)}`);
        return toots;
    }

    // Return a scoreInfo dict in a different format for the GUI (raw & weighted scores grouped in a subdict)
    static alternateScoreInfo(toot: Toot): Record<string, number | ScoreDisplayDict> {
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
            {} as Record<string, number | ScoreDisplayDict>
        )
    }

    // Add all the score info to a Toot's scoreInfo property
    private static async decorateWithScoreInfo(toot: Toot, scorers: Scorer[]): Promise<void> {
        const rawScores = {} as StringNumberDict;
        const weightedScores = {} as StringNumberDict;
        const userWeights = await Storage.getWeightings();
        const scores = await Promise.all(scorers.map((s) => s.score(toot)));
        const outlierDampener = userWeights[WeightName.OUTLIER_DAMPENER] || DEFAULT_WEIGHTS[WeightName.OUTLIER_DAMPENER];

        // Compute a weighted score a toot based by multiplying the value of each numerical property
        // by the user's chosen weighting for that property (the one configured with the GUI sliders).
        scorers.forEach((scorer, i) => {
            const scoreValue = scores[i] || 0;
            rawScores[scorer.name] = scoreValue;
            weightedScores[scorer.name] = scoreValue * (userWeights[scorer.name] ?? 0);

            if (toot.realToot().isTrending()) {
                weightedScores[scorer.name] *= (userWeights[WeightName.TRENDING] ?? 0);
            }

            if (outlierDampener > 0 && weightedScores[scorer.name] > 0) {
                weightedScores[scorer.name] = Math.pow(weightedScores[scorer.name], 1 / outlierDampener);
            }
        });

        // Multiple weighted score by time decay penalty to get a final weightedScore
        const timeDecayWeight = userWeights[WeightName.TIME_DECAY] || DEFAULT_WEIGHTS[WeightName.TIME_DECAY];
        const decayExponent = -1 * Math.pow(toot.ageInHours(), Config.timelineDecayExponent);
        const timeDecayMultiplier = Math.pow(timeDecayWeight + 1, decayExponent);
        const weightedScore = this.sumScores(weightedScores);
        const score = weightedScore * timeDecayMultiplier;

        // Preserve rawScores, timeDecayMultiplier, and weightedScores for debugging
        const scoreInfo = {
            rawScore: this.sumScores(rawScores),
            rawScores,
            score: score,
            timeDecayMultiplier,
            weightedScores,
            weightedScore,
        } as TootScore;

        // if (score < -10) {
        //     console.debug(`Negative score ${score} for ${toot.realToot().describe()}:`, scoreInfo);
        // }

        // TODO: duping the score to realToot() is a hack that sucks
        toot.realToot().scoreInfo = toot.scoreInfo = scoreInfo
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
