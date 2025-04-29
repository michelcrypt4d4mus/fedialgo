import Scorer from "./scorer";
import Toot from '../api/objects/toot';
import { StringNumberDict } from "../types";
export default abstract class FeedScorer extends Scorer {
    setFeed(feed: Toot[]): void;
    abstract feedExtractor(feed: Toot[]): StringNumberDict;
}
