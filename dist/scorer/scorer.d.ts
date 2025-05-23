import Toot from '../api/objects/toot';
import { ScoreName, StringNumberDict, WeightInfo } from "../types";
export default abstract class Scorer {
    abstract description: string;
    defaultWeight: number;
    isReady: boolean;
    name: ScoreName;
    scoreData: StringNumberDict;
    constructor(name: ScoreName);
    getInfo(): WeightInfo;
    score(toot: Toot): Promise<number>;
    abstract _score(_toot: Toot): Promise<number>;
    protected logPrefix(): string;
    static scoreToots(toots: Toot[], isScoringFeed?: boolean): Promise<Toot[]>;
    private static decorateWithScoreInfo;
    private static sumScores;
}
