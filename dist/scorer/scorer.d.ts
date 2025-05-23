import Toot from '../api/objects/toot';
import { ScoreName, ScoresStats, StringNumberDict, WeightInfo } from "../types";
type WeightedAndUnweightedScores = Record<string, number | StringNumberDict>;
type AlternateScoreDict = Record<string, number | WeightedAndUnweightedScores>;
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
    static alternateScoreInfo(toot: Toot): AlternateScoreDict;
    static computeScoreStats(toots: Toot[], numPercentiles: number): ScoresStats;
    static scoreToots(toots: Toot[], isScoringFeed?: boolean): Promise<Toot[]>;
    private static decorateWithScoreInfo;
    private static scoreStats;
    private static sumScores;
}
export declare function formatScore(score: number): number;
export {};
