import FeatureScorer from './feature_scorer';
import FeedScorer from './feed_scorer';
import Toot from '../api/objects/toot';
import { ScorerInfo, StringNumberDict, WeightName } from "../types";
type ScoreDisplayDict = Record<string, number | StringNumberDict>;
type AlternateScoreDict = Record<string, number | ScoreDisplayDict>;
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
    protected logPrefix(): string;
    private checkIsReady;
    static scoreToots(toots: Toot[], featureScorers: FeatureScorer[], feedScorers: FeedScorer[]): Promise<Toot[]>;
    static alternateScoreInfo(toot: Toot): AlternateScoreDict;
    private static decorateWithScoreInfo;
    private static sumScores;
}
export {};
