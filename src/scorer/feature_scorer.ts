/*
 * Base class for a "feature scorer" which appears to be something that can score
 * a toot based solely on the properties of that toot, optionally coupled with other
 * sources that are not other toots in the feed, e.g. things like notifications,
 * favorites, etc.
 *
 * // TODO: Find a better name than "Feature" for this class
 */
import { mastodon } from "masto";

import Scorer from "./scorer";
import Toot from '../api/objects/toot';
import { StringNumberDict, WeightName } from "../types";


interface RankParams {
    // featureGetter() is a fxn to get data the scorer needs, e.g. most commonly retooted users
    featureGetter?: () => Promise<StringNumberDict>,
    scoreName: WeightName,
};

export default class FeatureScorer extends Scorer {
    featureGetter: (api: mastodon.rest.Client) => Promise<StringNumberDict>;
    feature: StringNumberDict = {};  // TODO: rename this to supportData or something

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

        console.log(`${this.constructor.name} featureGetter() returned:`, this.feature);
        this.isReady = true;
        return [];  // this is a hack so we can safely use Promise.all().flat() to pull startup data
    }
};
