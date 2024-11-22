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
        return feed.reduce((obj: Record<string, number>, status: StatusType) => {
            obj[status.uri] = (obj[status.uri] || 0) + 1;

            if (status.reblog) {
                obj[status.reblog.uri] = (obj[status.reblog.uri] || 0) + 1;
            }

            return obj;
        }, {});
    }

    async score(status: StatusType) {
        super.score(status);  // checks if ready
        return this.features[status.reblog?.uri || status.uri] || 0;
    }
}
