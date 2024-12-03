import { mastodon } from "masto";
import Scorer from "./Scorer";
import { AccountFeature, StringNumberDict } from "../types";
interface RankParams {
    description: string;
    defaultWeight?: number;
    featureGetter?: (api: mastodon.rest.Client) => Promise<AccountFeature | StringNumberDict>;
    scoreName: string;
}
export default class FeatureScorer extends Scorer {
    featureGetter: (api: mastodon.rest.Client) => Promise<AccountFeature | StringNumberDict>;
    feature: AccountFeature | StringNumberDict;
    constructor(params: RankParams);
    getFeature(api: mastodon.rest.Client): Promise<void>;
}
export {};
