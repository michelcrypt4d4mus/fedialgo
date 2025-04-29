/*
 * Generates a NEGATIVE score based on how many times the tooter has tooted recently to help
 * prevent prolific tooters from clogging up the feed.
 */
import FeedScorer from "../feed_scorer";
import Toot, { sortByCreatedAt } from '../../api/objects/toot';
import { incrementCount, shuffle } from "../../helpers/collection_helpers";
import { StringNumberDict, WeightName } from "../../types";


export default class DiversityFeedScorer extends FeedScorer {
    constructor() {
        super(WeightName.DIVERSITY);
    }

    // Count toots by account (but negative instead of positive count)
    // *NOTE: The penalty for frequent tooters decreases by 1 each time a toot is scored*
    //        As a result this.scoreData must be reset anew each time the feed is updated
    feedExtractor(feed: Toot[]): StringNumberDict {
        const sortedToots = sortByCreatedAt(feed).reverse() as Toot[];
        console.info(`DiversityFeedScorer: ${sortedToots.length} toots in sorted feed:`, sortedToots.slice(0, 10));

        // Collate the overall score for each account
        const accountScores = sortedToots.reduce(
            (tootCounts, toot) => {
                incrementCount(tootCounts, toot.account.webfingerURI(), -1);
                if (toot.reblog?.account) incrementCount(tootCounts, toot.reblog.account.webfingerURI(), -1);
                return tootCounts;
            },
            {} as StringNumberDict
        );

        // Create a dict with a score for each toot, keyed by uri (mutates userScores)
        return sortedToots.reduce(
            (scores, toot) => {
                incrementCount(accountScores, toot.account.webfingerURI());
                scores[toot.uri] = accountScores[toot.account.webfingerURI()] || 0;

                if (toot.reblog) {
                    incrementCount(accountScores, toot.reblog.account.webfingerURI());
                    scores[toot.uri] += (accountScores[toot.reblog.account.webfingerURI()] || 0);
                }

                return scores;
            },
            {} as StringNumberDict
        );
    }

    async _score(toot: Toot) {
        const score = this.scoreData[toot.uri] || 0;
        if (score > 0) console.warn(`Got positive diversity score of ${score} for toot:`, toot);
        return score;
    }
};
