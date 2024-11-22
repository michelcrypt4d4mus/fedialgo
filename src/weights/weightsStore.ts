/*
 * Stores the user's preferred weight for each post scorer.
 */
import Storage, { Key } from "../Storage";
import { ScoresType } from "../types";


export default class WeightsStore extends Storage {
    static async getWeight(verboseName: string) {
        const weight = await this.get(Key.WEIGHTS, true, verboseName) as ScoresType;
        if (weight != null) {
            return weight;
        }
        return { [verboseName]: 1 };
    }

    // Update the persistent storage with a single user weighting
    static async setWeights(weights: ScoresType, verboseName: string) {
        await this.set(Key.WEIGHTS, weights, true, verboseName);
    }

    static async getWeightsMulti(verboseNames: string[]) {
        const weights: ScoresType = {}

        for (const verboseName of verboseNames) {
            const weight = await this.getWeight(verboseName);
            weights[verboseName] = weight[verboseName];
        }

        return weights;
    }

    // Update the persistent storage with all user weightings at the same time
    static async setWeightsMulti(weights: ScoresType) {
        for (const verboseName in weights) {
            await this.setWeights({ [verboseName]: weights[verboseName] }, verboseName);
        }
    }

    static async defaultFallback(verboseName: string, defaultWeight: number): Promise<boolean> {
        // If the weight is not set, set it to the default weight
        const weight = await this.get(Key.WEIGHTS, true, verboseName) as ScoresType;
        console.log(`Loaded default ${verboseName} user weight: ${weight} (defaultWeight arg: ${defaultWeight})`);

        if (weight == null) {
            await this.setWeights({ [verboseName]: defaultWeight }, verboseName);
            return true;
        }

        return false;
    }
};
