import FeedScorer from "../feed_scorer";
import Toot from '../../api/objects/toot';
import { type StringNumberDict } from "../../types";
/**
 * Scores based on how many times each author or trending tag appears in the feed.
 * @class
 */
export default class DiversityFeedScorer extends FeedScorer {
    description: string;
    constructor();
    extractScoringData(feed: Toot[]): StringNumberDict;
    _score(toot: Toot): Promise<number>;
    private computePenalty;
}
