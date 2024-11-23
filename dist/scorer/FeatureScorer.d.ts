import { mastodon } from "masto";
import { AccountFeature, Toot } from "../types";
interface RankParams {
    featureGetter: (api: mastodon.rest.Client) => Promise<AccountFeature>;
    verboseName: string;
    description?: string;
    defaultWeight?: number;
}
export default class FeatureScorer {
    featureGetter: (api: mastodon.rest.Client) => Promise<AccountFeature>;
    feature: AccountFeature;
    private _verboseName;
    private _isReady;
    private _description;
    private _defaultWeight;
    constructor(params: RankParams);
    getFeature(api: mastodon.rest.Client): Promise<void>;
    score(_api: mastodon.rest.Client, _toot: Toot): Promise<number>;
    getVerboseName(): string;
    getDescription(): string;
    getDefaultWeight(): number;
}
export {};
