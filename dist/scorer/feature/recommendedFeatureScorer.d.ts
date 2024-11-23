import { mastodon } from "masto";
import FeatureScorer from '../FeatureScorer';
import { StatusType } from "../../types";
export default class recommendedFeatureScorer extends FeatureScorer {
    constructor();
    score(_api: mastodon.rest.Client, toot: StatusType): Promise<number>;
}
