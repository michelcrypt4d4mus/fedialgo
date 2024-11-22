import Storage from "../Storage";
import { ScoresType } from "../types";
export default class WeightsStore extends Storage {
    static getWeight(verboseName: string): Promise<ScoresType>;
    static setWeights(weights: ScoresType, verboseName: string): Promise<void>;
    static getWeightsMulti(verboseNames: string[]): Promise<ScoresType>;
    static setWeightsMulti(weights: ScoresType): Promise<void>;
    static defaultFallback(verboseName: string, defaultWeight: number): Promise<boolean>;
}
