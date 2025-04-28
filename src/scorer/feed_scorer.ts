/*
 * Base class for scorers that require processing external data before they can score anything.
 * For example DiversityFeedScorer has to count how many toots by each user are in your feed
 * before it knows how much to penalize prolific tooters.
 */
import Scorer from "./scorer";
import Toot from '../api/objects/toot';
import { StringNumberDict } from "../types";


export default abstract class FeedScorer extends Scorer {
    // Take an array of Toots and extract the scoreData needed to score a toot
    async setFeed(feed: Toot[]): Promise<void> {
        this.scoreData = this.feedExtractor(feed);
        console.debug(`after ${this.constructor.name}.feedExtractor() scoreData = `, this.scoreData);
        this.isReady = true;
    }

    // Required implementation of the feed extractor function called in setFeed()
    abstract feedExtractor(feed: Toot[]): StringNumberDict;
};
