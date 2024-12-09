import Scorer from "./scorer";
import Toot from '../api/objects/toot';
export default class FeedScorer extends Scorer {
    features: Record<string, number>;
    setFeed(feed: Toot[]): Promise<void>;
    feedExtractor(_feed: Toot[]): Record<string, number>;
}
