import { mastodon } from "masto";
import Scorer from "./Scorer";
import { AccountFeature, TagFeature } from "../types";
interface RankParams {
    description: string;
    defaultWeight?: number;
    featureGetter?: (api: mastodon.rest.Client) => Promise<AccountFeature | TagFeature>;
    scoreName: string;
}
export default class FeatureScorer extends Scorer {
    featureGetter: (api: mastodon.rest.Client) => Promise<AccountFeature | TagFeature>;
    feature: AccountFeature | TagFeature;
    constructor(params: RankParams);
    getFeature(api: mastodon.rest.Client): Promise<void>;
}
export {};
