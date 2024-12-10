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


export default abstract class FeatureScorer extends Scorer {
    requiredData: StringNumberDict = {};  // TODO: rename this to supportData or something

    constructor(scoreName: WeightName) {
        super(scoreName);
    }

    // Can be overloaded in subclasses to retrieve feature data from the server
    async featureGetter(): Promise<StringNumberDict> {
        return {}
    }

    async getFeature(): Promise<Toot[]> {
        try {
            this.requiredData = await this.featureGetter();
        } catch (e) {
            console.warn(`Error in getFeature() for ${this.name}:`, e);
        }

        console.log(`${this.constructor.name} featureGetter() returned:`, this.requiredData);
        this.isReady = true;
        return [];  // this is a hack so we can safely use Promise.all().flat() to pull startup data
    }
};
