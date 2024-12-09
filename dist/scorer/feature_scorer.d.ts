import { mastodon } from "masto";
import Scorer from "./scorer";
import Toot from '../api/objects/toot';
import { StringNumberDict, WeightName } from "../types";
interface RankParams {
    featureGetter?: () => Promise<StringNumberDict>;
    scoreName: WeightName;
}
export default class FeatureScorer extends Scorer {
    featureGetter: (api: mastodon.rest.Client) => Promise<StringNumberDict>;
    feature: StringNumberDict;
    constructor(params: RankParams);
    getFeature(api: mastodon.rest.Client): Promise<Toot[]>;
}
export {};
