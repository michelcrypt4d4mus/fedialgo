import FeedScorer from "../feed_scorer";
import { StringNumberDict, Toot } from "../../types";
export default class DiversityFeedScorer extends FeedScorer {
    constructor();
    feedExtractor(feed: Toot[]): StringNumberDict;
    _score(toot: Toot): Promise<number>;
}
