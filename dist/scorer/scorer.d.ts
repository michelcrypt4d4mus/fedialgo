import Toot from '../api/objects/toot';
import { WeightInfo, StringNumberDict, WeightName } from "../types";
type WeightedAndUnweightedScores = Record<string, number | StringNumberDict>;
type AlternateScoreDict = Record<string, number | WeightedAndUnweightedScores>;
export default abstract class Scorer {
    defaultWeight: number;
    description: string;
    isReady: boolean;
    name: WeightName;
    scoreData: StringNumberDict;
    constructor(name: WeightName);
    getInfo(): WeightInfo;
    score(toot: Toot): Promise<number>;
    abstract _score(_toot: Toot): Promise<number>;
    protected logPrefix(): string;
    private checkIsReady;
    static scoreToots(toots: Toot[], isScoringFeed?: boolean): Promise<Toot[]>;
    static alternateScoreInfo(toot: Toot): AlternateScoreDict;
    private static decorateWithScoreInfo;
    private static sumScores;
}
export {};
