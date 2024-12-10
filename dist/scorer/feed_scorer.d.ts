import Scorer from "./scorer";
import Toot from '../api/objects/toot';
import { StringNumberDict } from "../types";
export default abstract class FeedScorer extends Scorer {
    features: Record<string, number>;
    setFeed(feed: Toot[]): Promise<void>;
    abstract feedExtractor(_feed: Toot[]): StringNumberDict;
}
