/*
 * Base class for a "feature scorer" which appears to be something that can score
 * a toot based solely on the properties of that toot and does not have to refer to
 * any external information.
 */
import { mastodon } from "masto";

import { AccountFeature, Toot } from "../types";


interface RankParams {
    featureGetter: (api: mastodon.rest.Client) => Promise<AccountFeature>,
    scoreName: string,
    description?: string,
    defaultWeight?: number,
};


export default class FeatureScorer {
    featureGetter: (api: mastodon.rest.Client) => Promise<AccountFeature>;
    feature: AccountFeature = {};

    private _scoreName: string;
    private _isReady: boolean = false;
    private _description: string = "";
    private _defaultWeight: number = 1;

    constructor(params: RankParams) {
        this.featureGetter = params.featureGetter;
        this._scoreName = params.scoreName;
        this._description = params.description || "";
        this._defaultWeight = params.defaultWeight || 1;
    }

    async getFeature(api: mastodon.rest.Client) {
        this._isReady = true;
        this.feature = await this.featureGetter(api);
    }

    async score(_api: mastodon.rest.Client, _toot: Toot): Promise<number> {
        return 0;
    }

    getVerboseName() {
        return this._scoreName;
    }

    getDescription() {
        return this._description;
    }

    getDefaultWeight() {
        return this._defaultWeight;
    }
};
