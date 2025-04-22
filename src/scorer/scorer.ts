/*
 * Base class for Toot scorers.
 */
import Storage from "../Storage";
import Toot from '../api/objects/toot';
import { DEFAULT_WEIGHTS } from "./weight_presets";
import { SCORERS_CONFIG } from "../config";
import { ScorerInfo, StringNumberDict, TootScore, WeightName } from "../types";

const TIME_DECAY = WeightName.TIME_DECAY;


export default abstract class Scorer {
    defaultWeight: number;
    description: string;
    name: WeightName;
    isReady: boolean = false;

    constructor(name: WeightName) {
        // console.debug(`Scorer's this.constructor.name: ${this.constructor.name}`);
        this.name = name;
        this.description = SCORERS_CONFIG[name].description;
        this.defaultWeight = DEFAULT_WEIGHTS[name] ?? 1;
    }

    async score(toot: Toot): Promise<number> {
        this.checkIsReady();
        return await this._score(toot);
    }

    abstract _score(_toot: Toot): Promise<number>;

    getInfo(): ScorerInfo {
        return {
            description: this.description,
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
        const tootToScore = toot.reblog ?? toot;
        const rawScores = {} as StringNumberDict;
        const weightedScores = {} as StringNumberDict;
        const userWeights = await Storage.getWeightings();
        const scores = await Promise.all(scorers.map(s => s.score(tootToScore)));
        tootToScore.followedTags ??= [];

        // Compute a weighted score a toot based by multiplying the value of each numerical property
        // by the user's chosen weighting for that property (the one configured with the GUI sliders).
        scorers.forEach((scorer, i) => {
            const scoreValue = scores[i] || 0;
            rawScores[scorer.name] = scoreValue;
            weightedScores[scorer.name] = scoreValue * (userWeights[scorer.name] ?? 0);
            rawScore += weightedScores[scorer.name];
        });

        // Multiple rawScore by time decay penalty to get a final value
        const timeDecay = userWeights[TIME_DECAY] || DEFAULT_WEIGHTS[TIME_DECAY];
        const seconds = Math.floor((new Date().getTime() - new Date(tootToScore.createdAt).getTime()) / 1000);
        const timeDecayMultiplier = Math.pow((1 + timeDecay), -1 * Math.pow((seconds / 3600), 2));

        tootToScore.scoreInfo = {
            rawScore,
            rawScores,
            score: 0,
            timeDecayMultiplier,
            weightedScores,
        } as TootScore;

        // Trending toots usually have a lot of reblogs, likes, replies, etc. so they get disproportionately
        // high scores. To adjust for this we hack a final adjustment to the score by multiplying by the
        // trending weighting value.
        if (tootToScore.isTrending()) {
            tootToScore.scoreInfo.rawScore *= (userWeights[WeightName.TRENDING] ?? 0);
        }

        tootToScore.scoreInfo.score = tootToScore.scoreInfo.rawScore * timeDecayMultiplier;
        toot.scoreInfo = tootToScore.scoreInfo;  // Copy the score info to the retoot if need be
    }
};
