import FeedScorer from "../FeedScorer";
import { Toot } from "../../types";
export default class DiversityFeedScorer extends FeedScorer {
    constructor();
    feedExtractor(feed: Toot[]): Record<string, number>;
    score(toot: Toot): Promise<number>;
}
