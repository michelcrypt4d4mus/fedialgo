/*
 * Generates a NEGATIVE score based on how many times the tooter has tooted recently to help
 * prevent prolific tooters from clogging up the feed.
 */
import FeedScorer from "../feed_scorer";
import ObjWithCountList from "../../api/obj_with_counts_list";
import Toot, { sortByCreatedAt } from '../../api/objects/toot';
import { config } from "../../config";
import { incrementCount } from "../../helpers/collection_helpers";
import { ScoreName } from '../../enums';
import { type ObjWithTootCount, type StringNumberDict } from "../../types";

interface PenalizedObj extends ObjWithTootCount {
    numSeen?: number;  // How many of this object have been seen during the scoring process
    numToPenalize?: number;
    penaltyIncrement?: number;
};


export default class DiversityFeedScorer extends FeedScorer {
    description = "Favour accounts that are tooting a lot right now";

    constructor() {
        super(ScoreName.DIVERSITY);
    }

    // Compute a score for each toot in the feed based on how many times the account has tooted
    // and which trending tags it contains.
    extractScoringData(feed: Toot[]): StringNumberDict {
        const sortedToots = sortByCreatedAt(feed) as Toot[];
        const accountsInFeed = new ObjWithCountList<PenalizedObj>([], ScoreName.DIVERSITY);
        const trendingTagsInFeed = new ObjWithCountList<PenalizedObj>([], ScoreName.DIVERSITY);

        // Count how many times each account and each trending tag are seen in the feed
        sortedToots.forEach((toot) => {
            toot.withRetoot().forEach((t) => accountsInFeed.incrementCount(t.account.webfingerURI));

            // Penalties for trending tags are similar to those for accounts but we base the max penalty
            // on the TrendingTag's numAccounts property (the fediverse-wide number of accounts using that tag)
            toot.realToot().trendingTags!.forEach((tag) => {
                const penalizedTag = trendingTagsInFeed.incrementCount(tag.name);
                penalizedTag.numAccounts = Math.max(tag.numAccounts || 0, penalizedTag.numAccounts || 0);
                penalizedTag.penaltyIncrement = penalizedTag.numAccounts / penalizedTag.numToots!;
                penalizedTag.numToPenalize = penalizedTag.numToots! - config.scoring.minTrendingTagTootsForPenalty;
            });
        });

        this.logger.deep(`tagsEncountered:`, trendingTagsInFeed);

        // Create a dict with a score for each toot, keyed by uri (mutates accountScores in the process)
        // The biggest penalties are applied to toots encountered first. We want to penalize the oldest toots the most.
        return sortedToots.reduce(
            (tootScores, toot) => {
                toot.withRetoot().forEach((t) => {
                    const penalty = this.computePenalty(accountsInFeed, t.account.webfingerURI);
                    incrementCount(tootScores, toot.uri, penalty);
                });

                // Additional penalties for trending tags
                (toot.realToot().trendingTags || []).forEach((tag) => {
                    const penalty = this.computePenalty(trendingTagsInFeed, tag.name);

                    // Don't apply penalty to followed accounts/tags
                    if (!toot.isFollowed()) {
                        incrementCount(tootScores, toot.uri, penalty);
                    }
                })

                return tootScores;
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
    private computePenalty(penalizedObjs: ObjWithCountList<PenalizedObj>, name: string): number {
        const obj = penalizedObjs.getObj(name)!;
        obj.numSeen = (obj.numSeen || 0) + 1;

        // Don't penalize if we've already dispensed enough penalties
        if (obj.numToPenalize && obj.numSeen > obj.numToPenalize) {
            return 0;
        } else {
            return (obj.numToots! - obj.numSeen!) * (obj.penaltyIncrement || 1);
        }
    }
};
