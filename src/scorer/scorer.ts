/*
 * Base class for Toot scorers.
 */
import Storage from "../Storage";
import Toot from '../api/objects/toot';
import { DEFAULT_WEIGHTS } from "./weight_presets";
import { ScorerInfo, StringNumberDict, TootScore, WeightName, Weights } from "../types";
import { SCORERS_CONFIG } from "../config";
import { sumValues } from "../helpers/collection_helpers";


export default abstract class Scorer {
    defaultWeight: number;
    description: string;
    name: WeightName;
    isReady: boolean = false;
    scoresRetoots: boolean = false;

    constructor(name: WeightName) {
        // TODO: Maybe use this.constructor.name as the name property?
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
        const rawScores = {} as StringNumberDict;
        const weightedScores = {} as StringNumberDict;
        const userWeights = await Storage.getWeightings();
        const tootToScore = toot.reblog ?? toot;
        tootToScore.followedTags ??= [];
        // If scoresRetoots is true the scorer will handle both the original toot and the retoot
        const scores = await Promise.all(scorers.map((s) => s.score(s.scoresRetoots ? toot : tootToScore)));

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

        // Multiple weighted score by time decay penalty to get a final weightedScore
        const timeDecayWeight = userWeights[WeightName.TIME_DECAY] || DEFAULT_WEIGHTS[WeightName.TIME_DECAY];
        // const timeDecayMultiplier = 1.0 / Math.pow(tootToScore.ageInHours(), timeDecayWeight);
        const timeDecayMultiplier = Math.pow(timeDecayWeight + 1, -1 * Math.pow(tootToScore.ageInHours(), 1.2));
        const weightedScore = this.sumScores(weightedScores);

        // Preserve rawScores, timeDecayMultiplier, and weightedScores for debugging
        tootToScore.scoreInfo = {
            rawScore: this.sumScores(rawScores),
            rawScores,
            score: weightedScore * timeDecayMultiplier,
            timeDecayMultiplier,
            weightedScores,
            weightedScore,
        } as TootScore;

        // Copy the score info to the retoot if need be  // TODO: duping the score for retoots is a hack
        toot.scoreInfo = tootToScore.scoreInfo;
    }

    // Add 1 so that time decay multiplier works even with scorers giving 0s
    private static sumScores(scores: StringNumberDict | Weights): number {
        return 1 + sumValues(scores);
    }
};
