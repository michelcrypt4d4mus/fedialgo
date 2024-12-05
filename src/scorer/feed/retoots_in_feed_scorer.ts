/*
 * Score how many times a toot has been retooted by other accounts in the feed.
 */
import FeedScorer from "../feed_scorer";
import { Toot } from "../../types";
import { WeightName } from "../../types";


export default class RetootsInFeedScorer extends FeedScorer {
    constructor() {
        super(WeightName.RETOOTED_IN_FEED);
    }

    // For each uri in the feed, count the number of times it appears as a reblogged toot.
    feedExtractor(feed: Toot[]) {
        return feed.reduce(
            (tootCounts: Record<string, number>, toot: Toot) => {
                if (toot.reblog) {
                    tootCounts[toot.reblog.uri] = (tootCounts[toot.reblog.uri] || 0) + 1;
                }

                return tootCounts;
            },
            {}
        );
    }

    async _score(toot: Toot) {
        return this.features[toot.reblog?.uri || toot.uri] || 0;
    }
};
