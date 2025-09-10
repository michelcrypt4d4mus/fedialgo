import Scorer from "./scorer";
import type Toot from '../api/objects/toot';
import { type StringNumberDict } from "../types";
/**
 * Base class for scorers that require processing external data before they can score anything.
 * For example {@linkcode DiversityFeedScorer} has to count how many toots by each user are in
 * your feed before it knows how much to penalize prolific tooters.
 */
export default abstract class FeedScorer extends Scorer {
    extractScoreDataFromFeed(feed: Toot[]): void;
    abstract extractScoringData(feed: Toot[]): StringNumberDict;
}
