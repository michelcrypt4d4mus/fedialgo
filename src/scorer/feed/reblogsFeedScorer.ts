import FeedScorer from "../FeedScorer";
import { Toot } from "../../types";

const DEFAULT_REBLOGS_WEIGHT = 2;


// TODO: rename retootsFeedScorer
export default class reblogsFeedScorer extends FeedScorer {
    constructor() {
        super(
            "reblogsFeed",  // TODO: rename to reblogCount
            "Favor posts that have been retooted many times",
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
