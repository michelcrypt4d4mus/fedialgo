import Scorer from "./scorer";
import { StringNumberDict } from "../types";
import { ScoreName } from './scorer';
export default abstract class FeatureScorer extends Scorer {
    constructor(scoreName: ScoreName);
    fetchRequiredData(): Promise<void>;
    prepareScoreData(): Promise<StringNumberDict>;
}
