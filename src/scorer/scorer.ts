/*
 * Base class for Toot scorers.
 */
import Storage from "../Storage";
import Toot from '../api/objects/toot';
import { DEFAULT_WEIGHTS } from "../config";
import { ScorerInfo, StringNumberDict, TootScore, WeightName } from "../types";

const TIME_DECAY = WeightName.TIME_DECAY;


export default class Scorer {
    defaultWeight: number;
    description: string;
    name: WeightName;
    isReady: boolean = false;

    constructor(name: WeightName) {
        console.log(`Scorer's this.constructor.name: ${this.constructor.name}`);
        this.name = name;
        this.description = DEFAULT_WEIGHTS[name].description;
        this.defaultWeight = DEFAULT_WEIGHTS[name].defaultWeight ?? 1;
    }

    async score(toot: Toot): Promise<number> {
        this.checkIsReady();
        return await this._score(toot);
    }

    //* _score() should be overloaded in subclasses. *//
    async _score(_toot: Toot): Promise<number> {
        throw new Error("Method not implemented.");
    }

    getInfo(): ScorerInfo {
        return {
            description: this.description,
            defaultWeight: this.defaultWeight,
            scorer: this,
        };
    }

    private checkIsReady(): void {
        if (!this.isReady) {
            const msg = `${this.name} scorer not ready!`;
            console.warn(msg);
            throw new Error(msg);
        }
    }

    // Add all the score into to a toot, including a final score
    static async decorateWithScoreInfo(toot: Toot, scorers: Scorer[]): Promise<void> {
        // console.debug(`decorateWithScoreInfo ${describeToot(toot)}: `, toot);
        let rawScore = 1;
        const rawScores = {} as StringNumberDict;
        const weightedScores = {} as StringNumberDict;
        const userWeights = await Storage.getWeightings();
        const scores = await Promise.all(scorers.map(s => s.score(toot)));
        toot.followedTags ??= [];

        // Compute a weighted score a toot based by multiplying the value of each numerical property
        // by the user's chosen weighting for that property (the one configured with the GUI sliders).
        scorers.forEach((scorer, i) => {
            const scoreValue = scores[i] || 0;
            rawScores[scorer.name] = scoreValue;
            weightedScores[scorer.name] = scoreValue * (userWeights[scorer.name] ?? 0);
            rawScore += weightedScores[scorer.name];
        });

        // Trending toots usually have a lot of reblogs, likes, replies, etc. so they get disproportionately
        // high scores. To fix this we hack a final adjustment to the score by multiplying by the
        // trending toot weighting if the weighting is less than 1.0.
        const trendingScore = rawScores[WeightName.TRENDING_TOOTS] ?? 0;
        const trendingWeighting = userWeights[WeightName.TRENDING_TOOTS] ?? 0;
        if (trendingScore > 0 && trendingWeighting < 1.0) rawScore *= trendingWeighting;

        // Multiple rawScore by time decay penalty to get a final value
        const timeDecay = userWeights[TIME_DECAY] || DEFAULT_WEIGHTS[TIME_DECAY].defaultWeight;
        const seconds = Math.floor((new Date().getTime() - new Date(toot.createdAt).getTime()) / 1000);
        const timeDecayMultiplier = Math.pow((1 + timeDecay), -1 * Math.pow((seconds / 3600), 2));
        const score = rawScore * timeDecayMultiplier;

        toot.scoreInfo = {
            rawScore,
            rawScores,
            score,
            timeDecayMultiplier,
            weightedScores,
        } as TootScore;

        // If it's a retoot copy the scores to the retooted toot as well // TODO: this is janky
        if (toot.reblog) toot.reblog.scoreInfo = toot.scoreInfo;
    }
};
