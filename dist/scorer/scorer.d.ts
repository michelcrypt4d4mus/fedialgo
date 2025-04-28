import Toot from '../api/objects/toot';
import { ScorerInfo, WeightName } from "../types";
export default abstract class Scorer {
    defaultWeight: number;
    description: string;
    name: WeightName;
    isReady: boolean;
    scoresRetoots: boolean;
    constructor(name: WeightName);
    score(toot: Toot): Promise<number>;
    abstract _score(_toot: Toot): Promise<number>;
    getInfo(): ScorerInfo;
    private checkIsReady;
    static decorateWithScoreInfo(toot: Toot, scorers: Scorer[]): Promise<void>;
    private static sumScores;
}
