import { mastodon } from "masto";
import Scorer from "./Scorer";
import { AccountFeature, ScoresType } from "../types";
interface RankParams {
    description: string;
    defaultWeight?: number;
    featureGetter?: (api: mastodon.rest.Client) => Promise<AccountFeature | ScoresType>;
    scoreName: string;
}
export default class FeatureScorer extends Scorer {
    featureGetter: (api: mastodon.rest.Client) => Promise<AccountFeature | ScoresType>;
    feature: AccountFeature | ScoresType;
    constructor(params: RankParams);
    getFeature(api: mastodon.rest.Client): Promise<void>;
}
export {};
