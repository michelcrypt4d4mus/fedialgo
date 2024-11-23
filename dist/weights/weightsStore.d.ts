import Storage from "../Storage";
import { ScoresType } from "../types";
export default class WeightsStore extends Storage {
    static getScoreWeight(scoreName: string): Promise<ScoresType>;
    static setScoreWeights(weights: ScoresType, scoreName: string): Promise<void>;
    static getUserWeightsMulti(scoreNames: string[]): Promise<ScoresType>;
    static setScoreWeightsMulti(weights: ScoresType): Promise<void>;
    static defaultFallback(scoreName: string, defaultWeight: number): Promise<boolean>;
}
