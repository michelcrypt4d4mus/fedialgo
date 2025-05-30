import Scorer from "./scorer";
import Toot from '../api/objects/toot';
import { type StringNumberDict } from "../types";
export default abstract class FeedScorer extends Scorer {
    extractScoreDataFromFeed(feed: Toot[]): void;
    abstract extractScoringData(feed: Toot[]): StringNumberDict;
}
