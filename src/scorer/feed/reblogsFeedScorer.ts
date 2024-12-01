/*
 * Score how many times a toot has been retooted by other accounts in the feed.
 */
import FeedScorer from "../FeedScorer";
import { Toot } from "../../types";

const DEFAULT_REBLOGS_WEIGHT = 2;
const SCORE_NAME = "RetootedInFeed";


// TODO: rename retootsFeedScorer
export default class ReblogsFeedScorer extends FeedScorer {
    constructor() {
        super(
            SCORE_NAME,
            "Favour toots that are retooted by other accounts in your feed",
            DEFAULT_REBLOGS_WEIGHT
        );
    }

    // for each uri in the feed, count the number of times it appears
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

    async score(toot: Toot) {
        super.score(toot);  // checks if ready
        return this.features[toot.reblog?.uri || toot.uri] || 0;
    }
};
