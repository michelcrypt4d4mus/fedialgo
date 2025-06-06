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
const obj_with_counts_list_1 = __importDefault(require("../../api/obj_with_counts_list"));
const toot_1 = require("../../api/objects/toot");
const config_1 = require("../../config");
const collection_helpers_1 = require("../../helpers/collection_helpers");
const enums_1 = require("../../enums");
;
class DiversityFeedScorer extends feed_scorer_1.default {
    description = "Favour accounts that are tooting a lot right now";
    constructor() {
        super(enums_1.ScoreName.DIVERSITY);
    }
    // Count toots by account (but negative instead of positive count)
    extractScoringData(feed) {
        const sortedToots = (0, toot_1.sortByCreatedAt)(feed);
        const accountsInFeed = new obj_with_counts_list_1.default([], enums_1.ScoreName.DIVERSITY);
        const trendingTagsInFeed = new obj_with_counts_list_1.default([], enums_1.ScoreName.DIVERSITY);
        // Count how many times each account and each trending tag have in the feed
        sortedToots.forEach((toot) => {
            toot.withRetoot().forEach((t) => {
                const accountTally = accountsInFeed.incrementCount(t.account.webfingerURI);
                accountTally.penaltyIncrement = 1;
            });
            toot.realToot().trendingTags.forEach((tag) => {
                const trendingTagTally = trendingTagsInFeed.incrementCount(tag.name);
                // Find the max numAccounts value for the tag across all toots
                trendingTagTally.numAccounts = Math.max(tag.numAccounts || 0, trendingTagTally.numAccounts || 0);
                trendingTagTally.penaltyIncrement = trendingTagTally.numAccounts / trendingTagTally.numToots;
                trendingTagTally.numToPenalize = trendingTagTally.numToots - config_1.config.scoring.minTrendingTagTootsForPenalty;
            });
        });
        this.logger.trace(`tagsEncountered:`, trendingTagsInFeed);
        // Create a dict with a score for each toot, keyed by uri (mutates accountScores in the process)
        // The biggest penalties are applied to toots encountered first. We want to penalize the oldest toots the most.
        return sortedToots.reduce((scores, toot) => {
            toot.withRetoot().forEach((t) => {
                const accountTally = accountsInFeed.getObj(t.account.webfingerURI);
                accountTally.numSeen = (accountTally.numSeen || 0) + 1;
                (0, collection_helpers_1.incrementCount)(scores, t.uri, this.computePenalty(accountTally));
            });
            // Additional penalties for trending tags
            (toot.realToot().trendingTags || []).forEach((tag) => {
                const trendingTagTally = trendingTagsInFeed.getObj(tag.name);
                trendingTagTally.numSeen = (trendingTagTally.numSeen || 0) + 1;
                // Don't apply penalty to followed or most receent minTrendingTagTootsForPenalty toots in feed
                if (!toot.isFollowed() && (trendingTagTally.numSeen <= trendingTagTally.numToPenalize)) {
                    (0, collection_helpers_1.incrementCount)(scores, toot.uri, this.computePenalty(trendingTagTally));
                }
            });
            return scores;
        }, {});
    }
    async _score(toot) {
        const score = this.scoreData[toot.uri] || 0;
        if (score < 0) {
            // Deal with floating point noise resulting in mildly posivitive scores
            if (score > -0.2) {
                this.scoreData[toot.uri] = 0;
            }
            else {
                console.warn(`Got negative diversity score of ${score.toFixed(2)} for toot: ${toot.describe()}:`, toot);
            }
            return 0;
        }
        return score;
    }
    // The more often we see an object, the less we want to penalize it
    computePenalty(obj) {
        return (obj.numToots - obj.numSeen) * obj.penaltyIncrement;
    }
}
exports.default = DiversityFeedScorer;
;
//# sourceMappingURL=diversity_feed_scorer.js.map