import { mastodon } from "masto";
import FeatureScorer from '../FeatureScorer';
import { Toot } from "../../types";
export declare const TRENDING_POSTS = "topPosts";
export declare const TRENDING_POSTS_DEFAULT_WEIGHT = 0.1;
export default class TopPostFeatureScorer extends FeatureScorer {
    constructor();
    score(_api: mastodon.rest.Client, toot: Toot): Promise<number>;
}
