/*
 * Base class for a "feature scorer" which appears to be something that can score
 * a toot based solely on the properties of that toot, optionally coupled with other
 * sources that are not other toots in the feed, e.g. things like notifications,
 * favorites, etc.
 */
import { mastodon } from "masto";

import Scorer from "./Scorer";
import { FeedFeature, Toot } from "../types";


interface RankParams {
    description: string,
    defaultWeight?: number,
    featureGetter?: (api: mastodon.rest.Client) => Promise<FeedFeature>,
    scoreName: string,
};


export default class FeatureScorer extends Scorer {
    // The featureGetter is a fxn that retrieves data the scorer will need to score a toot,
    // e.g. things like most commonly retooted users etc.
    featureGetter: (api: mastodon.rest.Client) => Promise<FeedFeature>;
    feature: FeedFeature = {};

    constructor(params: RankParams) {
        super(params.scoreName, params.description, params.defaultWeight);
        this.featureGetter = params.featureGetter || (async () => { return {} });
    }

    async getFeature(api: mastodon.rest.Client): Promise<Toot[]> {
        this.feature = await this.featureGetter(api);
        this._isReady = true;
        return [];  // TODO: this is a hack so we can use Promise.all() to get 'allResponses'
    }
};
