/*
 * Base class for scorers that require processing external data before they can score anything.
 * For example DiversityFeedScorer has to count how many toots by each user are in your feed
 * before it knows how much to penalize prolific tooters.
 */
import Scorer from "./scorer";
import Toot from '../api/objects/toot';
import { StringNumberDict } from "../types";


export default abstract class FeedScorer extends Scorer {
    requiredData: StringNumberDict = {};

    async setFeed(feed: Toot[]) {
        // console.debug(`before feedExtractor() this.features=`, this.features);
        this.requiredData = this.feedExtractor(feed);
        console.debug(`after ${this.constructor.name}.feedExtractor() this.features=`, this.requiredData);
        this.isReady = true;
    }

    abstract feedExtractor(_feed: Toot[]): StringNumberDict;
};
