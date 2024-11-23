import { mastodon } from "masto";
import { AccountFeature, Toot } from "../types";
interface RankParams {
    description?: string;
    defaultWeight?: number;
    featureGetter: (api: mastodon.rest.Client) => Promise<AccountFeature>;
    scoreName: string;
}
export default class FeatureScorer {
    featureGetter: (api: mastodon.rest.Client) => Promise<AccountFeature>;
    feature: AccountFeature;
    private _description;
    private _defaultWeight;
    private _isReady;
    private _scoreName;
    constructor(params: RankParams);
    getFeature(api: mastodon.rest.Client): Promise<void>;
    score(_api: mastodon.rest.Client, _toot: Toot): Promise<number>;
    getScoreName(): string;
    getDescription(): string;
    getDefaultWeight(): number;
}
export {};
