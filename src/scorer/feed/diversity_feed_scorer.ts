/*
 * Generates a NEGATIVE score based on how many times the tooter has tooted recently to help
 * prevent prolific tooters from clogging up the feed.
 */
import FeedScorer from "../feed_scorer";
import Storage from "../../Storage";
import Toot, { sortByCreatedAt } from '../../api/objects/toot';
import { incrementCount } from "../../helpers/collection_helpers";
import { StringNumberDict, WeightName } from "../../types";
import { traceLog } from "../../helpers/log_helpers";


export default class DiversityFeedScorer extends FeedScorer {
    constructor() {
        super(WeightName.DIVERSITY);
    }

    // Count toots by account (but negative instead of positive count)
    extractScoringData(feed: Toot[]): StringNumberDict {
        const sortedToots = sortByCreatedAt(feed).reverse() as Toot[];
        const tootsPerAccount: StringNumberDict = {}
        const trendingTagUsageCounts: StringNumberDict = {};
        const trendingTagPenalty: StringNumberDict = {};
        const tootsWithTagScoredSoFar: StringNumberDict = {};

        // Collate the overall score for each account. The penalty for frequent tooters decreases by 1 per toot.
        // and also a penalty for trending tags, which is the number of toots in the feed that have used the tag
        // divided by the tag.numAccounts.
        sortedToots.forEach((toot) => {
            incrementCount(tootsPerAccount, toot.account.webfingerURI);
            if (toot.reblog?.account) incrementCount(tootsPerAccount, toot.reblog.account.webfingerURI);

            if (!toot.trendingTags) {
                console.warn(`No trending tags for toot:`, toot);
            } else {
                for (const tag of toot.trendingTags!) {
                    incrementCount(trendingTagUsageCounts, tag.name);
                    trendingTagPenalty[tag.name] ||= -1 * (tag.numAccounts || 1);  // At first this is just tag.numAccounts
                    tootsWithTagScoredSoFar[tag.name] ||= 0;
                }
            }
        });

        const trendingTagIncrement = Object.entries(trendingTagPenalty).reduce(
            (increments, [tagName, penalty]) => {
                increments[tagName] = -1 * penalty / (trendingTagUsageCounts[tagName] || 1);
                return increments;
            }, {} as StringNumberDict
        );

        console.log(`${this.logPrefix()} trendingTagIncrements:`, trendingTagIncrement);

        // Create a dict with a score for each toot, keyed by uri (mutates accountScores in the process)
        return sortedToots.reduce(
            (scores, toot) => {
                incrementCount(tootsPerAccount, toot.account.webfingerURI, -1);
                scores[toot.uri] = -1 * (tootsPerAccount[toot.account.webfingerURI] || 0);

                if (toot.reblog) {
                    incrementCount(tootsPerAccount, toot.reblog.account.webfingerURI, -1);
                    scores[toot.uri] -= (tootsPerAccount[toot.reblog.account.webfingerURI] || 0);
                }

                // Don't penalize people we follow for their trending tags
                if (toot.isFollowed || toot.reblog?.isFollowed) {
                    if (toot.trendingTags?.length) traceLog(`${this.logPrefix()} Not penalizing followed toot:`, toot.realToot().describe());
                    return scores;
                }

                (toot.trendingTags || []).forEach((tag) => {
                    // Always decrement the penalty for the tag
                    incrementCount(trendingTagPenalty, tag.name, trendingTagIncrement[tag.name]);
                    incrementCount(tootsWithTagScoredSoFar, tag.name);
                    const logStr = `penalty: ${trendingTagPenalty[tag.name]}, increment: ${trendingTagIncrement[tag.name]}, scored so far: ${tootsWithTagScoredSoFar[tag.name]} for toot ${toot.realToot().describe()}`;

                    // ...but only apply the penalty after MIN_TRENDING_TAGS_FOR_PENALTY toots have been passed over
                    if (tootsWithTagScoredSoFar[tag.name] > Storage.getConfig().minTrendingTagTootsForPenalty) {
                        scores[toot.uri] += trendingTagPenalty[tag.name] || 0;
                        traceLog(`${this.logPrefix()} TrendingTag '#${tag.name}' ${logStr}`);
                    } else {
                        traceLog(`${this.logPrefix()} TrendingTag PASSING OVER '#${tag.name}' ${logStr}`);
                    }
                })

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
