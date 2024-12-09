import { mastodon } from "masto";
import Scorer from "./scorer";
import Toot from '../api/objects/toot';
import { FeedFeature, WeightName } from "../types";
interface RankParams {
    featureGetter?: (api: mastodon.rest.Client) => Promise<FeedFeature>;
    scoreName: WeightName;
}
export default class FeatureScorer extends Scorer {
    featureGetter: (api: mastodon.rest.Client) => Promise<FeedFeature>;
    feature: FeedFeature;
    constructor(params: RankParams);
    getFeature(api: mastodon.rest.Client): Promise<Toot[]>;
}
export {};
