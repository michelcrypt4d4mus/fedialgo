"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Generates a NEGATIVE score based on how many times the tooter has tooted recently to help
 * prevent prolific tooters from clogging up the feed.
 */
const feed_scorer_1 = __importDefault(require("../feed_scorer"));
const toot_1 = require("../../api/objects/toot");
const config_1 = require("../../config");
const collection_helpers_1 = require("../../helpers/collection_helpers");
const types_1 = require("../../types");
const log_helpers_1 = require("../../helpers/log_helpers");
class DiversityFeedScorer extends feed_scorer_1.default {
    constructor() {
        super(types_1.WeightName.DIVERSITY);
    }
    // Count toots by account (but negative instead of positive count)
    extractScoringData(feed) {
        const sortedToots = (0, toot_1.sortByCreatedAt)(feed);
        const tootsPerAccount = {};
        const trendingTagTootsInFeedCount = {};
        const trendingTagPenalty = {};
        const tootsWithTagScoredSoFar = {};
        // Collate the overall score for each account. The penalty for frequent tooters decreases by 1 per toot.
        // and also a penalty for trending tags, which is the number of toots in the feed that have used the tag
        // divided by the tag.numAccounts.
        sortedToots.forEach((toot) => {
            (0, collection_helpers_1.incrementCount)(tootsPerAccount, toot.account.webfingerURI);
            if (toot.reblog)
                (0, collection_helpers_1.incrementCount)(tootsPerAccount, toot.reblog.account.webfingerURI);
            if (!toot.realToot().trendingTags) {
                console.warn(`No trending tags for toot:`, toot);
            }
            else {
                toot.realToot().trendingTags.forEach((tag) => {
                    (0, collection_helpers_1.incrementCount)(trendingTagTootsInFeedCount, tag.name);
                    // Set trendingTagPenalty[tag.name] to the max tag.numAccounts value we find
                    trendingTagPenalty[tag.name] = Math.max(tag.numAccounts || 0, trendingTagPenalty[tag.name] || 0);
                    tootsWithTagScoredSoFar[tag.name] = 0;
                });
            }
        });
        // Build a dict of tagName => penaltyIncrement
        const trendingTagIncrement = Object.entries(trendingTagPenalty).reduce((increments, [tagName, trendingNumAccountsVal]) => {
            increments[tagName] = trendingNumAccountsVal / (trendingTagTootsInFeedCount[tagName] || 1);
            return increments;
        }, {});
        (0, log_helpers_1.traceLog)(`${this.logPrefix()} trendingTagIncrements:`, trendingTagIncrement);
        // Create a dict with a score for each toot, keyed by uri (mutates accountScores in the process)
        // The biggest penalties are applied to toots encountered first. We want to penalize the oldest toots the most.
        return sortedToots.reduce((scores, toot) => {
            (0, collection_helpers_1.decrementCount)(tootsPerAccount, toot.account.webfingerURI);
            scores[toot.uri] = -1 * (tootsPerAccount[toot.account.webfingerURI] || 0);
            if (toot.reblog) {
                (0, collection_helpers_1.decrementCount)(tootsPerAccount, toot.reblog.account.webfingerURI);
                scores[toot.uri] -= (tootsPerAccount[toot.reblog.account.webfingerURI] || 0);
            }
            (toot.realToot().trendingTags || []).forEach((tag) => {
                // Always decrement the penalty for the tag
                (0, collection_helpers_1.incrementCount)(tootsWithTagScoredSoFar, tag.name);
                (0, collection_helpers_1.decrementCount)(trendingTagPenalty, tag.name, trendingTagIncrement[tag.name]);
                const logStr = `penalty: -${trendingTagPenalty[tag.name]}, increment: ${trendingTagIncrement[tag.name]}, scored so far: ${tootsWithTagScoredSoFar[tag.name]} for toot ${toot.realToot().describe()}`;
                if (toot.account.isFollowed || toot.reblog?.account.isFollowed) {
                    // if (toot.trendingTags?.length) traceLog(`${this.logPrefix()} Not penalizing followed toot:`, toot.realToot().describe());
                }
                else if (tootsWithTagScoredSoFar[tag.name] > config_1.Config.minTrendingTagTootsForPenalty) {
                    // TODO: this suddenly applies a massive penalty to the first toot beyond the threshold
                    // ...but only apply the penalty after MIN_TRENDING_TAGS_FOR_PENALTY toots have been passed over
                    scores[toot.uri] -= trendingTagPenalty[tag.name] || 0;
                    // traceLog(`${this.logPrefix()} TrendingTag '#${tag.name}' ${logStr}`);
                }
                else {
                    // traceLog(`${this.logPrefix()} TrendingTag PASSING OVER '#${tag.name}' ${logStr}`);
                }
            });
            return scores;
        }, {});
    }
    async _score(toot) {
        const score = this.scoreData[toot.uri] || 0;
        if (score > 0) {
            // Deal with floating point noise resulting in mildly posivitive scores
            if (score < 0.2) {
                this.scoreData[toot.uri] = 0;
            }
            else {
                console.warn(`Got positive diversity score of ${score.toFixed(2)} for toot: ${toot.describe()}:`, toot);
            }
            return 0;
        }
        return score;
    }
}
exports.default = DiversityFeedScorer;
;
//# sourceMappingURL=diversity_feed_scorer.js.map