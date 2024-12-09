/*
 * Base class for a "feature scorer" which appears to be something that can score
 * a toot based solely on the properties of that toot, optionally coupled with other
 * sources that are not other toots in the feed, e.g. things like notifications,
 * favorites, etc.
 */
import { mastodon } from "masto";

import Scorer from "./scorer";
import Toot from '../api/objects/toot';
import { FeedFeature, WeightName } from "../types";


interface RankParams {
    featureGetter?: (api: mastodon.rest.Client) => Promise<FeedFeature>,
    scoreName: WeightName,
};

export default class FeatureScorer extends Scorer {
    // The featureGetter is a fxn that retrieves data the scorer will need to score a toot,
    // e.g. things like most commonly retooted users etc.
    featureGetter: (api: mastodon.rest.Client) => Promise<FeedFeature>;
    feature: FeedFeature = {};  // TODO: rename this to supportData or something

    constructor(params: RankParams) {
        super(params.scoreName);
        this.featureGetter = params.featureGetter || (async (_api) => { return {} });
    }

    async getFeature(api: mastodon.rest.Client): Promise<Toot[]> {
        try {
            this.feature = await this.featureGetter(api);
        } catch (e) {
            console.warn(`Error in getFeature() for ${this.name}:`, e);
        }

        this._isReady = true;
        return [];  // this is a hack so we can safely use Promise.all().flat() to pull startup data
    }
};
