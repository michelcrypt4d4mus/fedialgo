import { mastodon } from "masto";
import FeatureScorer from '../FeatureScorer';
import { StatusType } from "../../types";
export declare const TOP_POSTS = "topPosts";
export declare const TOP_POSTS_DEFAULT_WEIGHT = 0.1;
export default class topPostFeatureScorer extends FeatureScorer {
    constructor();
    score(_api: mastodon.rest.Client, status: StatusType): Promise<number>;
}
