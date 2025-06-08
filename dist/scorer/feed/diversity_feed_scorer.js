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
    // Compute a score for each toot in the feed based on how many times the account has tooted
    // and which trending tags it contains.
    extractScoringData(feed) {
        const sortedToots = (0, toot_1.sortByCreatedAt)(feed);
        const accountsInFeed = new obj_with_counts_list_1.default([], enums_1.ScoreName.DIVERSITY);
        const trendingTagsInFeed = new obj_with_counts_list_1.default([], enums_1.ScoreName.DIVERSITY);
        // Count how many times each account and each trending tag are seen in the feed
        sortedToots.forEach((toot) => {
            toot.withRetoot().forEach((t) => accountsInFeed.incrementCount(t.account.webfingerURI));
            // Penalties for trending tags are similar to those for accounts but we base the max penalty
            // on the TrendingTag's numAccounts property (the fediverse-wide number of accounts using that tag)
            toot.realToot().trendingTags.forEach((tag) => {
                const penalizedTag = trendingTagsInFeed.incrementCount(tag.name);
                penalizedTag.numAccounts = Math.max(tag.numAccounts || 0, penalizedTag.numAccounts || 0);
                penalizedTag.penaltyIncrement = penalizedTag.numAccounts / penalizedTag.numToots;
                penalizedTag.numToPenalize = penalizedTag.numToots - config_1.config.scoring.minTrendingTagTootsForPenalty;
            });
        });
        this.logger.deep(`tagsEncountered:`, trendingTagsInFeed);
        // Create a dict with a score for each toot, keyed by uri (mutates accountScores in the process)
        // The biggest penalties are applied to toots encountered first. We want to penalize the oldest toots the most.
        return sortedToots.reduce((tootScores, toot) => {
            toot.withRetoot().forEach((t) => {
                const penalty = this.computePenalty(accountsInFeed, t.account.webfingerURI);
                (0, collection_helpers_1.incrementCount)(tootScores, toot.uri, penalty);
            });
            // Additional penalties for trending tags
            (toot.realToot().trendingTags || []).forEach((tag) => {
                const penalty = this.computePenalty(trendingTagsInFeed, tag.name);
                // Don't apply penalty to followed accounts/tags
                if (!toot.isFollowed()) {
                    (0, collection_helpers_1.incrementCount)(tootScores, toot.uri, penalty);
                }
            });
            return tootScores;
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
    computePenalty(penalizedObjs, name) {
        const obj = penalizedObjs.getObj(name);
        obj.numSeen = (obj.numSeen || 0) + 1;
        // Don't penalize if we've already dispensed enough penalties
        if (obj.numToPenalize && obj.numSeen > obj.numToPenalize) {
            return 0;
        }
        else {
            return (obj.numToots - obj.numSeen) * (obj.penaltyIncrement || 1);
        }
    }
}
exports.default = DiversityFeedScorer;
;
//# sourceMappingURL=diversity_feed_scorer.js.map