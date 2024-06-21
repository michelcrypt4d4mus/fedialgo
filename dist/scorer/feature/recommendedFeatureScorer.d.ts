import FeatureScorer from '../FeatureScorer';
import { StatusType } from "../../types";
import { mastodon } from "masto";
export default class recommendedFeatureScorer extends FeatureScorer {
    constructor();
    score(api: mastodon.rest.Client, status: StatusType): Promise<number>;
}
