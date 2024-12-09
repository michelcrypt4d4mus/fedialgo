/*
 * Base class for scorers that require processing external data before they can score anything.
 * For example DiversityFeedScorer has to count how many toots by each user are in your feed
 * before it knows how much to penalize prolific tooters.
 */
import Scorer from "./scorer";
import Toot from '../api/objects/toot';


export default class FeedScorer extends Scorer {
    features: Record<string, number> = {};

    async setFeed(feed: Toot[]) {
        // console.debug(`before feedExtractor() this.features=`, this.features);
        this.features = this.feedExtractor(feed);
        console.debug(`after ${this.constructor.name}.feedExtractor() this.features=`, this.features);
        this._isReady = true;
    }

    //* Should be overloaded in subclasses. */
    feedExtractor(_feed: Toot[]): Record<string, number> {
        throw new Error("Method not implemented.");
    }
};
