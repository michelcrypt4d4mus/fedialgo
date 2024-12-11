/*
 * Base class for a "feature scorer" which appears to be something that can score
 * a toot based solely on the properties of that toot, optionally coupled with other
 * data can be compiled before retrieving the whole feed, e.g. numFavorites, etc.
 */
import Scorer from "./scorer";
import Toot from '../api/objects/toot';
import { StringNumberDict, WeightName } from "../types";


// TODO: Find a better name than "Feature" for this class
export default abstract class FeatureScorer extends Scorer {
    requiredData: StringNumberDict = {};

    constructor(scoreName: WeightName) {
        super(scoreName);
    }

    // Can be overloaded in subclasses to retrieve feature data from the server
    async featureGetter(): Promise<StringNumberDict> {
        return {};
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
