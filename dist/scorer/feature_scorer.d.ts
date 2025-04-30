import { mastodon } from "masto";
import Scorer from "./scorer";
import { StringNumberDict, TrendingWithHistory, WeightName } from "../types";
export default abstract class FeatureScorer extends Scorer {
    constructor(scoreName: WeightName);
    featureGetter(): Promise<StringNumberDict>;
    fetchRequiredData(): Promise<void>;
    static decorateHistoryScores(_obj: mastodon.v1.TrendLink | mastodon.v1.Tag): void;
    static uniquifyTrendingObjs<T>(trendingObjs: TrendingWithHistory[], uniqueKey: (obj: TrendingWithHistory) => string): T[];
}
