/*
 * Score how many times a toot has been retooted by other accounts in the feed.
 */
import FeedScorer from "../feed_scorer";
import Toot from '../../api/objects/toot';
import { incrementCount } from "../../helpers/collection_helpers";
import { StringNumberDict, WeightName } from "../../types";


export default class RetootsInFeedScorer extends FeedScorer {
    constructor() {
        super(WeightName.RETOOTED_IN_FEED);
    }

    // For each uri in the feed, count the number of times it appears as a reblogged toot.
    // TODO: somehow toots that are retooted multiple times by followed accounts only get a score of 1
    feedExtractor(feed: Toot[]) {
        return feed.reduce(
            (tootCounts: StringNumberDict, toot: Toot) => {
                if (!toot.reblog) return tootCounts;
                incrementCount(tootCounts, toot.realURI());
                return tootCounts;
            },
            {} as StringNumberDict
        );
    }

    async _score(toot: Toot) {
        return this.scoreData[toot.realURI()] || 0;
    }
};
