/*
 * Stores the user's preferred weight for each post scorer.
 */
import Storage, { Key } from "../Storage";
import { ScoresType } from "../types";


export default class WeightsStore extends Storage {
    static async getScoreWeight(scoreName: string) {
        const weight = await this.get(Key.WEIGHTS, true, scoreName) as ScoresType;
        return weight != null ? weight : { [scoreName]: 1 };
    }

    // Update the persistent storage with a single user weighting
    static async setScoreWeights(weights: ScoresType, scoreName: string) {
        await this.set(Key.WEIGHTS, weights, true, scoreName);
    }

    static async getScoreWeightsMulti(scoreNames: string[]) {
        const weights: ScoresType = {}

        for (const scoreName of scoreNames) {
            const weight = await this.getScoreWeight(scoreName);
            weights[scoreName] = weight[scoreName];
        }

        return weights;
    }

    // Update the persistent storage with all user weightings at the same time
    static async setScoreWeightsMulti(weights: ScoresType) {
        for (const scoreName in weights) {
            await this.setScoreWeights({ [scoreName]: weights[scoreName] }, scoreName);
        }
    }

    static async defaultFallback(scoreName: string, defaultWeight: number): Promise<boolean> {
        // If the weight is not set, set it to the default weight
        const weight = await this.get(Key.WEIGHTS, true, scoreName) as ScoresType;
        console.log(`Loaded default ${scoreName} user weight: ${weight} (defaultWeight arg: ${defaultWeight})`);

        if (weight == null) {
            await this.setScoreWeights({ [scoreName]: defaultWeight }, scoreName);
            return true;
        }

        return false;
    }
};
