import { mastodon } from "masto";
import { AccountFeature, TagFeature, Toot } from "../types";
interface RankParams {
    description?: string;
    defaultWeight?: number;
    featureGetter?: (api: mastodon.rest.Client) => Promise<AccountFeature | TagFeature>;
    scoreName: string;
}
export default class FeatureScorer {
    featureGetter: (api: mastodon.rest.Client) => Promise<AccountFeature | TagFeature>;
    feature: AccountFeature | TagFeature;
    private _description;
    private _defaultWeight;
    private _isReady;
    private _scoreName;
    constructor(params: RankParams);
    getFeature(api: mastodon.rest.Client): Promise<void>;
    score(_toot: Toot): Promise<number>;
    getScoreName(): string;
    getDescription(): string;
    getDefaultWeight(): number;
}
export {};
