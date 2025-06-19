import Scorer from "./scorer";
import type Toot from '../api/objects/toot';
import { type StringNumberDict } from "../types";
export default abstract class FeedScorer extends Scorer {
    extractScoreDataFromFeed(feed: Toot[]): void;
    abstract extractScoringData(feed: Toot[]): StringNumberDict;
}
