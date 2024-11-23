/*
 * Generates a NEGATIVE score based on how many times the tooter has tooted recently to help
 * prevent prolific tooters from clogging up the feed.
 */
import FeedScorer from "../FeedScorer";
import { Toot } from "../../types";


export default class diversityFeedScorer extends FeedScorer {
    constructor() {
        super(
            "Diversity",
            "Disfavor posts from users that you have seen a lot of posts from already"
        );
    }

    feedExtractor(feed: Toot[]): Record<string, number> {
        const sortRandom = () => Math.random() - 0.5;  // this prevents just always the first post from being shown

        return feed.sort(sortRandom).reduce(
            (userTootCounts: Record<string, number>, toot) => {
                userTootCounts[toot.account.acct] = (userTootCounts[toot.account.acct] || 0) - 1;
                return userTootCounts;
            },
            {}
        );
    }

    // Note that the penalty for frequent tooters decreases by 1 each time a toot is scored
    async score(toot: Toot) {
        super.score(toot);  // Check if ready
        this.features[toot.account.acct] +=  1;
        return this.features[toot.account.acct];
    }
};
