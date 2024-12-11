import { mastodon } from "masto";
import Scorer from "./scorer";
import Toot from '../api/objects/toot';
import { StringNumberDict, TrendingWithHistory, WeightName } from "../types";
export default abstract class FeatureScorer extends Scorer {
    requiredData: StringNumberDict;
    constructor(scoreName: WeightName);
    featureGetter(): Promise<StringNumberDict>;
    fetchRequiredData(): Promise<Toot[]>;
    static decorateHistoryScores(_obj: mastodon.v1.TrendLink | mastodon.v1.Tag): void;
    static uniquifyTrendingObjs(trendingObjs: TrendingWithHistory[], uniqueKey: (obj: TrendingWithHistory) => string): TrendingWithHistory[];
}
