/*
 * Base class for Toot scorers.
 */
import Storage from "../Storage";
import Toot from '../api/objects/toot';
import { DEFAULT_WEIGHTS } from "./weight_presets";
import { SCORERS_CONFIG } from "../config";
import { ScorerInfo, StringNumberDict, TootScore, WeightName } from "../types";
import { sumValues } from "../helpers";

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

            if (tootToScore.isTrending()) {
                weightedScores[scorer.name] *= (userWeights[WeightName.TRENDING] ?? 0);
            }
        });

        // Multiple rawScore by time decay penalty to get a final value
        const timeDecay = userWeights[TIME_DECAY] || DEFAULT_WEIGHTS[TIME_DECAY];
        const timeDecayMultiplier = Math.pow((1 + timeDecay), -1 * Math.pow(tootToScore.ageInHours(), 2));
        // Add 1 so that time decay multiplier works even with scorers giving 0s
        const weightedScore = 1 + sumValues(weightedScores);

        tootToScore.scoreInfo = {
            rawScore: 1 + sumValues(rawScores),  // Add 1 for same reason as weightedScore
            rawScores,
            score: weightedScore * timeDecayMultiplier,
            timeDecayMultiplier,
            weightedScores,
            weightedScore,
        } as TootScore;

        // Copy the score info to the retoot if need be  // TODO: duping the score for retoots is a hack
        toot.scoreInfo = tootToScore.scoreInfo;
    }
};
