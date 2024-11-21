import FeatureScorer from '../FeatureScorer';
import { mastodon } from "masto";
import { StatusType } from "../../types";
export default class topPostFeatureScorer extends FeatureScorer {
    constructor();
    score(_api: mastodon.rest.Client, status: StatusType): Promise<0 | 1>;
}
