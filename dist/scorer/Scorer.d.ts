import { ScorerInfo, Toot, WeightName } from "../types";
export default class Scorer {
    name: WeightName;
    description: string;
    defaultWeight: number;
    protected _isReady: boolean;
    constructor(name: WeightName);
    score(toot: Toot): Promise<number>;
    _score(_toot: Toot): Promise<number>;
    getInfo(): ScorerInfo;
    private checkIsReady;
    static decorateWithScoreInfo(toot: Toot, scorers: Scorer[]): Promise<void>;
}
