import FeedScorer from "../FeedScorer";
import { Toot } from "../../types";

const DEFAULT_REBLOGS_WEIGHT = 2;
const SCORE_NAME = "RetootedInFeed";


// TODO: rename retootsFeedScorer
export default class ReblogsFeedScorer extends FeedScorer {
    constructor() {
        super(
            SCORE_NAME,
            "Favor toots that have been retooted by accounts in your feed",
            DEFAULT_REBLOGS_WEIGHT
        );
    }

    // for each uri in the feed, count the number of times it appears
    feedExtractor(feed: Toot[]) {
        return feed.reduce(
            (tootCounts: Record<string, number>, toot: Toot) => {
                tootCounts[toot.uri] = (tootCounts[toot.uri] || 0) + 1;

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
