import { mastodon } from "masto";
import Scorer from "./scorer";
import { FeedFeature, Toot } from "../types";
import { WeightName } from "../types";
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
