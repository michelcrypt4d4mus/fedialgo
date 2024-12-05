/*
 * Generates a NEGATIVE score based on how many times the tooter has tooted recently to help
 * prevent prolific tooters from clogging up the feed.
 */
import FeedScorer from "../feed_scorer";
import { Toot } from "../../types";
import { WeightName } from "../../config";


export default class DiversityFeedScorer extends FeedScorer {
    constructor() {
        super(WeightName.DIVERSITY);
    }

    feedExtractor(feed: Toot[]): Record<string, number> {
        // Shuffle the feed before penalizing multiple tooters
        // TODO: maybe reverse chronological order would be better?
        console.log(`DiversityFeedScorer.feedExtractor() called...`);
        const sortRandom = () => Math.random() - 0.5;

        return feed.toSorted(sortRandom).reduce(
            (userTootCounts: Record<string, number>, toot) => {
                userTootCounts[toot.account.acct] = (userTootCounts[toot.account.acct] || 0) - 1;
                return userTootCounts;
            },
            {}
        );
    }

    // *NOTE: the penalty for frequent tooters decreases by 1 each time a toot is scored*
    //        As a result this.features must be reset anew each time the feed is scored
    async _score(toot: Toot) {
        this.features[toot.account.acct] = (this.features[toot.account.acct] || 0) + 1;

        // TODO: this was a hack to avoid wildly overscoring diversity values because of a bug that should be fixed now
        if (this.features[toot.account.acct] > 0) {
            console.debug(`DiversityFeedScorer for ${toot.account.acct} has score over 0 (${this.features[toot.account.acct]}), diversity features:`, this.features);
            return 0;
        } else {
            return this.features[toot.account.acct];
        }
    }
};
