import FeedScorer from "../feed_scorer";
import Toot from '../../api/objects/toot';
export default class RetootsInFeedScorer extends FeedScorer {
    constructor();
    feedExtractor(feed: Toot[]): Record<string, number>;
    _score(toot: Toot): Promise<number>;
}
