/*
 * Base class for scorers that require processing external data before they can score anything.
 * For example DiversityFeedScorer has to count how many toots by each user are in your feed
 * before it knows how much to penalize prolific tooters.
 */
import Scorer from "./scorer";
import Toot from '../api/objects/toot';
import { StringNumberDict } from "../types";
import { traceLog } from "../helpers/log_helpers";


export default abstract class FeedScorer extends Scorer {
    // Take an array of Toots and extract the scoreData needed to score a toot
    extractScoreDataFromFeed(feed: Toot[]): void {
        this.scoreData = this.extractScoringData(feed);
        traceLog(`${this.logPrefix()} extractScoringData() returned scoreData:`, this.scoreData);
        this.isReady = true;
    }

    // Required implementation of the feed extractor function called in setFeed()
    abstract extractScoringData(feed: Toot[]): StringNumberDict;
};
