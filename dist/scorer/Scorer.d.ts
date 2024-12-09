import Toot from '../api/objects/toot';
import { ScorerInfo, WeightName } from "../types";
export default class Scorer {
    description: string;
    defaultWeight: number;
    name: WeightName;
    isReady: boolean;
    constructor(name: WeightName);
    score(toot: Toot): Promise<number>;
    _score(_toot: Toot): Promise<number>;
    getInfo(): ScorerInfo;
    private checkIsReady;
    static decorateWithScoreInfo(toot: Toot, scorers: Scorer[]): Promise<void>;
}
