/*
 * Base class for a "feature scorer" which appears to be something that can score
 * a toot based solely on the properties of that toot, optionally coupled with other
 * sources that are not other toots in the feed, e.g. things like notifications,
 * favorites, etc.
 */
import { mastodon } from "masto";

import { AccountFeature, Toot } from "../types";


interface RankParams {
    description?: string,
    defaultWeight?: number,
    featureGetter?: (api: mastodon.rest.Client) => Promise<AccountFeature>,
    scoreName: string,
};


export default class FeatureScorer {
    featureGetter: (api: mastodon.rest.Client) => Promise<AccountFeature>;
    feature: AccountFeature = {};

    private _description: string = "";
    private _defaultWeight: number = 1;
    private _isReady: boolean = false;
    private _scoreName: string;

    constructor(params: RankParams) {
        // The featureGetter is a fxn that retrieves data the scorer will need to score a toot,
        // e.g. things like most commonly retooted users etc.
        this.featureGetter = params.featureGetter || (async () => { return {} });
        this._scoreName = params.scoreName;
        this._description = params.description || "";
        // Take care not to overwrite a 0 default weight with a 1
        this._defaultWeight = params.defaultWeight == 0 ? 0 : (params.defaultWeight || 1);
    }

    // TODO: this seems backwards???
    async getFeature(api: mastodon.rest.Client) {
        this._isReady = true;
        this.feature = await this.featureGetter(api);
    }

    //* score() should be overloaded in subclasses *//
    async score(_toot: Toot): Promise<number> {
        return 0;
    }

    getScoreName() {
        return this._scoreName;
    }

    getDescription() {
        return this._description;
    }

    getDefaultWeight() {
        return this._defaultWeight;
    }
};
