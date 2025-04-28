import Toot from '../api/objects/toot';
import { ScorerInfo, StringNumberDict, WeightName } from "../types";
export default abstract class Scorer {
    defaultWeight: number;
    description: string;
    isReady: boolean;
    name: WeightName;
    scoreData: StringNumberDict;
    constructor(name: WeightName);
    getInfo(): ScorerInfo;
    score(toot: Toot): Promise<number>;
    abstract _score(_toot: Toot): Promise<number>;
    private checkIsReady;
    static decorateWithScoreInfo(toot: Toot, scorers: Scorer[]): Promise<void>;
    private static sumScores;
}
