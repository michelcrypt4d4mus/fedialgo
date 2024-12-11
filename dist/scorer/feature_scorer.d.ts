import Scorer from "./scorer";
import Toot from '../api/objects/toot';
import { StringNumberDict, TrendingLink, TrendingTag, WeightName } from "../types";
import { mastodon } from "masto";
export default abstract class FeatureScorer extends Scorer {
    requiredData: StringNumberDict;
    constructor(scoreName: WeightName);
    featureGetter(): Promise<StringNumberDict>;
    getFeature(): Promise<Toot[]>;
    static decorateHistoryScores(_obj: mastodon.v1.TrendLink | mastodon.v1.Tag): TrendingLink | TrendingTag;
}
