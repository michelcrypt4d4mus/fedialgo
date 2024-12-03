import { mastodon } from "masto";
import Scorer from "./Scorer";
import { FeedFeature, Toot } from "../types";
interface RankParams {
    description: string;
    defaultWeight?: number;
    featureGetter?: (api: mastodon.rest.Client) => Promise<FeedFeature>;
    scoreName: string;
}
export default class FeatureScorer extends Scorer {
    featureGetter: (api: mastodon.rest.Client) => Promise<FeedFeature>;
    feature: FeedFeature;
    constructor(params: RankParams);
    getFeature(api: mastodon.rest.Client): Promise<Toot[]>;
}
export {};
