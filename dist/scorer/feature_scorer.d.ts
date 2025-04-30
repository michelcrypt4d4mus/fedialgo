import Scorer from "./scorer";
import { StringNumberDict, WeightName } from "../types";
export default abstract class FeatureScorer extends Scorer {
    constructor(scoreName: WeightName);
    fetchRequiredData(): Promise<void>;
    prepareScoreData(): Promise<StringNumberDict>;
}
