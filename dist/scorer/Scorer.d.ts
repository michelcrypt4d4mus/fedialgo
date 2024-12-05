import { ScorerInfo, Toot } from "../types";
import { WeightName } from "../config";
export default class Scorer {
    name: string;
    description: string;
    defaultWeight: number;
    protected _isReady: boolean;
    constructor(name: WeightName);
    score(toot: Toot): Promise<number>;
    _score(_toot: Toot): Promise<number>;
    getInfo(): ScorerInfo;
    private checkIsReady;
}
