/*
 * Base class for Toot scorers.
 */
import { E_CANCELED, Mutex } from 'async-mutex';

import Storage from "../Storage";
import Toot from '../api/objects/toot';
import { DEFAULT_WEIGHTS } from "./weight_presets";
import { logAndThrowError } from "../helpers/string_helpers";
import { batchPromises, sumValues } from "../helpers/collection_helpers";
import { ScorerInfo, StringNumberDict, TootScore, WeightName, Weights } from "../types";
import { SCORERS_CONFIG } from "../config";
import FeatureScorer from './feature_scorer';
import FeedScorer from './feed_scorer';

const SCORE_MUTEX = new Mutex();


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

    static async scoreToots(
        toots: Toot[],
        featureScorers: FeatureScorer[],
        feedScorers: FeedScorer[]
    ): Promise<Toot[]> {
        const scorers = [...featureScorers, ...feedScorers];
        const logPrefix = `[scoreFeed()]`;
        console.debug(`${logPrefix} Scoring ${toots.length} toots with ${scorers.length} scorers...`);

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
                await batchPromises<Toot>(toots, (t) => this.decorateWithScoreInfo(t, scorers), "Scorer");
                // Sort feed based on score from high to low.
                toots.sort((a, b) => (b.scoreInfo?.score ?? 0) - (a.scoreInfo?.score ?? 0));
            } finally {
                releaseMutex();
            }
        } catch (e) {
            if (e == E_CANCELED) {
                console.debug(`${logPrefix} mutex cancellation`);
            } else {
                console.warn(`${logPrefix} caught error:`, e);
            }
        }

        return toots;
    }

    // Add all the score info to a Toot's scoreInfo property
    private static async decorateWithScoreInfo(toot: Toot, scorers: Scorer[]): Promise<void> {
        const rawScores = {} as StringNumberDict;
        const weightedScores = {} as StringNumberDict;
        const userWeights = await Storage.getWeightings();
        const scores = await Promise.all(scorers.map((s) => s.score(toot)));

        // Compute a weighted score a toot based by multiplying the value of each numerical property
        // by the user's chosen weighting for that property (the one configured with the GUI sliders).
        scorers.forEach((scorer, i) => {
            const scoreValue = scores[i] || 0;
            rawScores[scorer.name] = scoreValue;
            weightedScores[scorer.name] = scoreValue * (userWeights[scorer.name] ?? 0);

            if (toot.realToot().isTrending()) {
                weightedScores[scorer.name] *= (userWeights[WeightName.TRENDING] ?? 0);
            }
        });

        // Multiple weighted score by time decay penalty to get a final weightedScore
        const timeDecayWeight = userWeights[WeightName.TIME_DECAY] || DEFAULT_WEIGHTS[WeightName.TIME_DECAY];
        const decayExponent = -1 * Math.pow(toot.ageInHours(), Storage.getConfig().timelineDecayExponent);
        const timeDecayMultiplier = Math.pow(timeDecayWeight + 1, decayExponent);
        const weightedScore = this.sumScores(weightedScores);

        // Preserve rawScores, timeDecayMultiplier, and weightedScores for debugging
        // TODO: duping the score to realToot() is a hack that sucks
        toot.realToot().scoreInfo = toot.scoreInfo = {
            rawScore: this.sumScores(rawScores),
            rawScores,
            score: weightedScore * timeDecayMultiplier,
            timeDecayMultiplier,
            weightedScores,
            weightedScore,
        } as TootScore;
    }

    // Add 1 so that time decay multiplier works even with scorers giving 0s
    private static sumScores(scores: StringNumberDict | Weights): number {
        return 1 + sumValues(scores);
    }
};
