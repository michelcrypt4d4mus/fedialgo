import Scorer from "./scorer";
import Toot from '../api/objects/toot';
import { StringNumberDict } from "../types";
export default abstract class FeedScorer extends Scorer {
    feed: StringNumberDict;
    setFeed(feed: Toot[]): Promise<void>;
    abstract feedExtractor(_feed: Toot[]): StringNumberDict;
}
