import FeedScorer from "../feed_scorer";
import Toot from '../../api/objects/toot';
import { StringNumberDict } from "../../types";
export default class DiversityFeedScorer extends FeedScorer {
    constructor();
    feedExtractor(feed: Toot[]): StringNumberDict;
    _score(toot: Toot): Promise<number>;
}
