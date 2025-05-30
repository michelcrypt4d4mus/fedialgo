import Scorer from "./scorer";
import { ScoreName } from './scorer';
import { type StringNumberDict } from "../types";
export default abstract class FeatureScorer extends Scorer {
    constructor(scoreName: ScoreName);
    fetchRequiredData(): Promise<void>;
    prepareScoreData(): Promise<StringNumberDict>;
}
