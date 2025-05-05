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
const Storage_1 = __importDefault(require("../../Storage"));
const toot_1 = require("../../api/objects/toot");
const collection_helpers_1 = require("../../helpers/collection_helpers");
const types_1 = require("../../types");
const log_helpers_1 = require("../../helpers/log_helpers");
class DiversityFeedScorer extends feed_scorer_1.default {
    constructor() {
        super(types_1.WeightName.DIVERSITY);
    }
    // Count toots by account (but negative instead of positive count)
    extractScoringData(feed) {
        const sortedToots = (0, toot_1.sortByCreatedAt)(feed).reverse();
        const tootsPerAccount = {};
        const trendingTagUsageCounts = {};
        const trendingTagPenalty = {};
        const tootsWithTagScoredSoFar = {};
        // Collate the overall score for each account. The penalty for frequent tooters decreases by 1 per toot.
        // and also a penalty for trending tags, which is the number of toots in the feed that have used the tag
        // divided by the tag.numAccounts.
        sortedToots.forEach((toot) => {
            (0, collection_helpers_1.incrementCount)(tootsPerAccount, toot.account.webfingerURI);
            if (toot.reblog?.account)
                (0, collection_helpers_1.incrementCount)(tootsPerAccount, toot.reblog.account.webfingerURI);
            if (!toot.trendingTags) {
                console.warn(`No trending tags for toot:`, toot);
            }
            else {
                for (const tag of toot.trendingTags) {
                    (0, collection_helpers_1.incrementCount)(trendingTagUsageCounts, tag.name);
                    trendingTagPenalty[tag.name] ||= -1 * (tag.numAccounts || 1); // At first this is just tag.numAccounts
                    tootsWithTagScoredSoFar[tag.name] ||= 0;
                }
            }
        });
        const trendingTagIncrement = Object.entries(trendingTagPenalty).reduce((increments, [tagName, penalty]) => {
            increments[tagName] = -1 * penalty / (trendingTagUsageCounts[tagName] || 1);
            return increments;
        }, {});
        console.log(`${this.logPrefix()} trendingTagIncrements:`, trendingTagIncrement);
        // Create a dict with a score for each toot, keyed by uri (mutates accountScores in the process)
        return sortedToots.reduce((scores, toot) => {
            (0, collection_helpers_1.incrementCount)(tootsPerAccount, toot.account.webfingerURI, -1);
            scores[toot.uri] = -1 * (tootsPerAccount[toot.account.webfingerURI] || 0);
            if (toot.reblog) {
                (0, collection_helpers_1.incrementCount)(tootsPerAccount, toot.reblog.account.webfingerURI, -1);
                scores[toot.uri] -= (tootsPerAccount[toot.reblog.account.webfingerURI] || 0);
            }
            (toot.trendingTags || []).forEach((tag) => {
                // Always decrement the penalty for the tag
                (0, collection_helpers_1.incrementCount)(trendingTagPenalty, tag.name, trendingTagIncrement[tag.name]);
                (0, collection_helpers_1.incrementCount)(tootsWithTagScoredSoFar, tag.name);
                const logStr = `penalty: ${trendingTagPenalty[tag.name]}, increment: ${trendingTagIncrement[tag.name]}, scored so far: ${tootsWithTagScoredSoFar[tag.name]} for toot ${toot.realToot().describe()}`;
                if (toot.isFollowed || toot.reblog?.isFollowed) {
                    // if (toot.trendingTags?.length) traceLog(`${this.logPrefix()} Not penalizing followed toot:`, toot.realToot().describe());
                }
                else if (tootsWithTagScoredSoFar[tag.name] > Storage_1.default.getConfig().minTrendingTagTootsForPenalty) {
                    // ...but only apply the penalty after MIN_TRENDING_TAGS_FOR_PENALTY toots have been passed over
                    scores[toot.uri] += trendingTagPenalty[tag.name] || 0;
                    (0, log_helpers_1.traceLog)(`${this.logPrefix()} TrendingTag '#${tag.name}' ${logStr}`);
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
            console.warn(`Got positive diversity score of ${score} for toot:`, toot);
            return 0;
        }
        return score;
    }
}
exports.default = DiversityFeedScorer;
;
//# sourceMappingURL=diversity_feed_scorer.js.map