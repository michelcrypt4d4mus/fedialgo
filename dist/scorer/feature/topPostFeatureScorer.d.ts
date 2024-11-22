import FeatureScorer from '../FeatureScorer';
import { mastodon } from "masto";
import { StatusType } from "../../types";
export declare const TOP_POSTS = "topPosts";
export default class topPostFeatureScorer extends FeatureScorer {
    constructor();
    score(_api: mastodon.rest.Client, status: StatusType): Promise<number>;
}
