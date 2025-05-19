/*
 * Generates a NEGATIVE score based on how many times the tooter has tooted recently to help
 * prevent prolific tooters from clogging up the feed.
 */
import FeedScorer from "../feed_scorer";
import Toot, { sortByCreatedAt } from '../../api/objects/toot';
import { Config } from "../../config";
import { decrementCount, incrementCount } from "../../helpers/collection_helpers";
import { StringNumberDict, WeightName } from "../../types";
import { traceLog } from "../../helpers/log_helpers";


export default class DiversityFeedScorer extends FeedScorer {
    constructor() {
        super(WeightName.DIVERSITY);
    }

    // Count toots by account (but negative instead of positive count)
    extractScoringData(feed: Toot[]): StringNumberDict {
        const sortedToots = sortByCreatedAt(feed) as Toot[];
        const tootsPerAccount: StringNumberDict = {}
        const trendingTagTootsInFeedCount: StringNumberDict = {};
        const trendingTagPenalty: StringNumberDict = {};
        const tootsWithTagScoredSoFar: StringNumberDict = {};

        // Collate the overall score for each account. The penalty for frequent tooters decreases by 1 per toot.
        // and also a penalty for trending tags, which is the number of toots in the feed that have used the tag
        // divided by the tag.numAccounts.
        sortedToots.forEach((toot) => {
            incrementCount(tootsPerAccount, toot.account.webfingerURI);
            if (toot.reblog) incrementCount(tootsPerAccount, toot.reblog.account.webfingerURI);

            if (!toot.realToot().trendingTags) {
                console.warn(`No trending tags for toot:`, toot);
            } else {
                toot.realToot().trendingTags!.forEach((tag) => {
                    incrementCount(trendingTagTootsInFeedCount, tag.name);
                    // Set trendingTagPenalty[tag.name] to the max tag.numAccounts value we find
                    trendingTagPenalty[tag.name] = Math.max(tag.numAccounts || 0, trendingTagPenalty[tag.name] || 0);
                    tootsWithTagScoredSoFar[tag.name] = 0;
                });
            }
        });

        // Build a dict of tagName => penaltyIncrement
        const trendingTagIncrement = Object.entries(trendingTagPenalty).reduce(
            (increments, [tagName, trendingNumAccountsVal]) => {
                increments[tagName] = trendingNumAccountsVal / (trendingTagTootsInFeedCount[tagName] || 1);
                return increments;
            }, {} as StringNumberDict
        );

        traceLog(`${this.logPrefix()} trendingTagIncrements:`, trendingTagIncrement);

        // Create a dict with a score for each toot, keyed by uri (mutates accountScores in the process)
        // The biggest penalties are applied to toots encountered first. We want to penalize the oldest toots the most.
        return sortedToots.reduce(
            (scores, toot) => {
                decrementCount(tootsPerAccount, toot.account.webfingerURI);
                scores[toot.uri] = -1 * (tootsPerAccount[toot.account.webfingerURI] || 0);

                if (toot.reblog) {
                    decrementCount(tootsPerAccount, toot.reblog.account.webfingerURI);
                    scores[toot.uri] -= (tootsPerAccount[toot.reblog.account.webfingerURI] || 0);
                }

                (toot.realToot().trendingTags || []).forEach((tag) => {
                    // Always decrement the penalty for the tag
                    incrementCount(tootsWithTagScoredSoFar, tag.name);
                    decrementCount(trendingTagPenalty, tag.name, trendingTagIncrement[tag.name]);
                    const logStr = `penalty: -${trendingTagPenalty[tag.name]}, increment: ${trendingTagIncrement[tag.name]}, scored so far: ${tootsWithTagScoredSoFar[tag.name]} for toot ${toot.realToot().describe()}`;

                    if (toot.account.isFollowed || toot.reblog?.account.isFollowed) {
                        // if (toot.trendingTags?.length) traceLog(`${this.logPrefix()} Not penalizing followed toot:`, toot.realToot().describe());
                    } else if (tootsWithTagScoredSoFar[tag.name] > Config.minTrendingTagTootsForPenalty) {
                        // TODO: this suddenly applies a massive penalty to the first toot beyond the threshold
                        // ...but only apply the penalty after MIN_TRENDING_TAGS_FOR_PENALTY toots have been passed over
                        scores[toot.uri] -= trendingTagPenalty[tag.name] || 0;
                        // traceLog(`${this.logPrefix()} TrendingTag '#${tag.name}' ${logStr}`);
                    } else {
                        // traceLog(`${this.logPrefix()} TrendingTag PASSING OVER '#${tag.name}' ${logStr}`);
                    }
                })

                return scores;
            },
            {} as StringNumberDict
        );
    }

    async _score(toot: Toot) {
        const score = this.scoreData[toot.uri] || 0;

        if (score > 0) {
            // Deal with floating point noise resulting in mildly posivitive scores
            if (score < 0.2) {
                this.scoreData[toot.uri] = 0;
            } else {
                console.warn(`Got positive diversity score of ${score.toFixed(2)} for toot: ${toot.describe()}:`, toot);
            }

            return 0;
        }

        return score;
    }
};
