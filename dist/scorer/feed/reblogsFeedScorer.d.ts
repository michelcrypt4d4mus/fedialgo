import FeedScorer from "../FeedScorer";
import { Toot } from "../../types";
export default class ReblogsFeedScorer extends FeedScorer {
    constructor();
    feedExtractor(feed: Toot[]): Record<string, number>;
    _score(toot: Toot): Promise<number>;
}
