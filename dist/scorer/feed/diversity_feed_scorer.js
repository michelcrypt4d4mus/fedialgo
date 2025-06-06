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
const enums_1 = require("../../enums");
class DiversityFeedScorer extends feed_scorer_1.default {
    description = "Favour accounts that are tooting a lot right now";
    constructor() {
        super(enums_1.ScoreName.DIVERSITY);
    }
    // Count toots by account (but negative instead of positive count)
    extractScoringData(feed) {
        const sortedToots = (0, toot_1.sortByCreatedAt)(feed);
        const tootsPerAccount = {};
        const trendingTagTootsInFeedCount = {};
        const trendingTagPenalty = {};
        const tagsEncounteredCount = {};
        // const tootsWithTagPenaltyCount: StringNumberDict = {};
        // Collate the overall score for each account. The penalty for frequent tooters decreases by 1 per toot.
        // and also a penalty for trending tags, which is the number of toots in the feed that have used the tag
        // divided by the tag.numAccounts.
        sortedToots.forEach((toot) => {
            (0, collection_helpers_1.incrementCount)(tootsPerAccount, toot.account.webfingerURI);
            if (toot.reblog)
                (0, collection_helpers_1.incrementCount)(tootsPerAccount, toot.reblog.account.webfingerURI);
            toot.realToot().trendingTags.forEach((tag) => {
                (0, collection_helpers_1.incrementCount)(trendingTagTootsInFeedCount, tag.name);
                // Set trendingTagPenalty[tag.name] to the max tag.numAccounts value we find
                trendingTagPenalty[tag.name] = Math.max(tag.numAccounts || 0, trendingTagPenalty[tag.name] || 0);
                // Initialize tagsEncounteredCount[tag.name] to 0
                tagsEncounteredCount[tag.name] = 0;
            });
        });
        const trendingTagIncrement = (0, collection_helpers_1.divideDicts)(trendingTagPenalty, trendingTagTootsInFeedCount);
        const numPenalizedToots = (0, collection_helpers_1.subtractConstant)(trendingTagTootsInFeedCount, config_1.config.scoring.minTrendingTagTootsForPenalty);
        this.logger.trace(`trendingTagIncrements:`, trendingTagIncrement);
        // Add the current value of tootsPerAccount to the score for each toot then decrement that count
        // so it's lower the next time the account is encountered.
        const addToTootScore = (tootScores, toot) => {
            const webfingerURI = toot?.account?.webfingerURI;
            if (!webfingerURI)
                return;
            (0, collection_helpers_1.decrementCount)(tootsPerAccount, webfingerURI);
            (0, collection_helpers_1.incrementCount)(tootScores, toot.uri, tootsPerAccount[webfingerURI] || 0);
        };
        // Create a dict with a score for each toot, keyed by uri (mutates accountScores in the process)
        // The biggest penalties are applied to toots encountered first. We want to penalize the oldest toots the most.
        return sortedToots.reduce((scores, toot) => {
            addToTootScore(scores, toot);
            addToTootScore(scores, toot.reblog);
            // Additional penalties for trending tags
            (toot.realToot().trendingTags || []).forEach((tag) => {
                (0, collection_helpers_1.incrementCount)(tagsEncounteredCount, tag.name);
                // trendingTagPenalty starts out containing the max penalty and we decrement it each time encountered
                (0, collection_helpers_1.decrementCount)(trendingTagPenalty, tag.name, trendingTagIncrement[tag.name]);
                // Don't apply trending tag penalty if the toot is followed by the user
                if (toot.isFollowed())
                    return;
                // const logStr = `penalty: -${trendingTagPenalty[tag.name]}, increment: ${trendingTagIncrement[tag.name]}, scored so far: ${tootsWithTagScoredSoFar[tag.name]} for toot ${toot.realToot().describe()}`;
                // Don't apply trending tag penalty to the most recent minTrendingTagTootsForPenalty toots with this tag
                if (tagsEncounteredCount[tag.name] <= numPenalizedToots[tag.name]) {
                    scores[toot.uri] += trendingTagPenalty[tag.name] || 0;
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
}
exports.default = DiversityFeedScorer;
;
//# sourceMappingURL=diversity_feed_scorer.js.map