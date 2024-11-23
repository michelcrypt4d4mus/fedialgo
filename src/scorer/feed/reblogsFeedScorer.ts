import FeedScorer from "../FeedScorer";
import { StatusType } from "../../types";

const DEFAULT_REBLOGS_WEIGHT = 2;


export default class reblogsFeedScorer extends FeedScorer {
    constructor() {
        super(
            "reblogsFeed",  // TODO: rename to reblogCount
            "Favor posts that have been retooted many times",
            DEFAULT_REBLOGS_WEIGHT
        );
    }

    // for each uri in the feed, count the number of times it appears
    feedExtractor(feed: StatusType[]) {
        return feed.reduce((obj: Record<string, number>, toot: StatusType) => {
            obj[toot.uri] = (obj[toot.uri] || 0) + 1;

            if (toot.reblog) {
                obj[toot.reblog.uri] = (obj[toot.reblog.uri] || 0) + 1;
            }

            return obj;
        }, {});
    }

    async score(toot: StatusType) {
        super.score(toot);  // checks if ready
        return this.features[toot.reblog?.uri || toot.uri] || 0;
    }
}
