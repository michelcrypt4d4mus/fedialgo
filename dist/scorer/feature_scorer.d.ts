import { mastodon } from "masto";
import Scorer from "./scorer";
import Toot from '../api/objects/toot';
import { StringNumberDict, WeightName } from "../types";
export default abstract class FeatureScorer extends Scorer {
    requiredData: StringNumberDict;
    constructor(scoreName: WeightName);
    featureGetter(api: mastodon.rest.Client): Promise<StringNumberDict>;
    getFeature(api: mastodon.rest.Client): Promise<Toot[]>;
}
