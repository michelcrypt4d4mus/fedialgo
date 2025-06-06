/*
 * Generates a NEGATIVE score based on how many times the tooter has tooted recently to help
 * prevent prolific tooters from clogging up the feed.
 */
import FeedScorer from "../feed_scorer";
import ObjWithCountList from "../../api/obj_with_counts_list";
import Toot, { sortByCreatedAt } from '../../api/objects/toot';
import { config } from "../../config";
import { decrementCount, divideDicts, incrementCount, subtractConstant } from "../../helpers/collection_helpers";
import { ScoreName } from '../../enums';
import { ObjWithTootCount, type StringNumberDict } from "../../types";

interface EnounteredObjWithTootCount extends ObjWithTootCount {
    numSeen?: number;  // How many of this object have been seen during the scoring process
    numToPenalize?: number;
    penaltyIncrement?: number;
};


export default class DiversityFeedScorer extends FeedScorer {
    description = "Favour accounts that are tooting a lot right now";

    constructor() {
        super(ScoreName.DIVERSITY);
    }

    // Count toots by account (but negative instead of positive count)
    extractScoringData(feed: Toot[]): StringNumberDict {
        const sortedToots = sortByCreatedAt(feed) as Toot[];
        const accountsInFeed = new ObjWithCountList<EnounteredObjWithTootCount>([], ScoreName.DIVERSITY);
        const trendingTagsInFeed = new ObjWithCountList<EnounteredObjWithTootCount>([], ScoreName.DIVERSITY);

        // Count how many times each account and each trending tag have in the feed
        sortedToots.forEach((toot) => {
            toot.withRetoot().forEach((t) => {
                const accountTally = accountsInFeed.incrementCount(t.account.webfingerURI);
                accountTally.penaltyIncrement = 1;
            });

            toot.realToot().trendingTags!.forEach((tag) => {
                const trendingTagTally = trendingTagsInFeed.incrementCount(tag.name);
                // Find the max numAccounts value for the tag across all toots
                trendingTagTally.numAccounts = Math.max(tag.numAccounts || 0, trendingTagTally.numAccounts || 0);
                trendingTagTally.penaltyIncrement = trendingTagTally.numAccounts / trendingTagTally.numToots!;
                trendingTagTally.numToPenalize = trendingTagTally.numToots! - config.scoring.minTrendingTagTootsForPenalty;
            });
        });

        this.logger.trace(`tagsEncountered:`, trendingTagsInFeed);

        // Create a dict with a score for each toot, keyed by uri (mutates accountScores in the process)
        // The biggest penalties are applied to toots encountered first. We want to penalize the oldest toots the most.
        return sortedToots.reduce(
            (scores, toot) => {
                toot.withRetoot().forEach((t) => {
                    const accountTally = accountsInFeed.getObj(t.account.webfingerURI)!;
                    accountTally.numSeen = (accountTally.numSeen || 0) + 1;
                    incrementCount(scores, t.uri, this.computePenalty(accountTally));
                });

                // Additional penalties for trending tags
                (toot.realToot().trendingTags || []).forEach((tag) => {
                    const trendingTagTally = trendingTagsInFeed.getObj(tag.name)!;
                    trendingTagTally.numSeen = (trendingTagTally.numSeen || 0) + 1;

                    // Don't apply penalty to followed or most receent minTrendingTagTootsForPenalty toots in feed
                    if (!toot.isFollowed() && (trendingTagTally.numSeen <= trendingTagTally.numToPenalize!)) {
                        incrementCount(scores, toot.uri, this.computePenalty(trendingTagTally));
                    }
                })

                return scores;
            },
            {} as StringNumberDict
        );
    }

    async _score(toot: Toot) {
        const score = this.scoreData[toot.uri] || 0;

        if (score < 0) {
            // Deal with floating point noise resulting in mildly posivitive scores
            if (score > -0.2) {
                this.scoreData[toot.uri] = 0;
            } else {
                console.warn(`Got negative diversity score of ${score.toFixed(2)} for toot: ${toot.describe()}:`, toot);
            }

            return 0;
        }

        return score;
    }

    // The more often we see an object, the less we want to penalize it
    private computePenalty(obj: EnounteredObjWithTootCount): number {
        return (obj.numToots! - obj.numSeen!) * obj.penaltyIncrement!
    }
};
