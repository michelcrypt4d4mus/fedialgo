import Scorer from "./scorer";
import { ScoreName } from '../enums';
import { type StringNumberDict } from "../types";
export default abstract class TootScorer extends Scorer {
    constructor(scoreName: ScoreName);
    fetchRequiredData(): Promise<void>;
    prepareScoreData(): Promise<StringNumberDict>;
}
