/*
 * Generates a NEGATIVE score based on how many times the tooter has tooted recently to help
 * prevent prolific tooters from clogging up the feed.
 */
import md5 from "blueimp-md5";

import FeedScorer from "../feed_scorer";
import Toot from '../../api/objects/toot';
import { incrementCount } from "../../helpers";
import { StringNumberDict, WeightName } from "../../types";


export default class DiversityFeedScorer extends FeedScorer {
    constructor() {
        super(WeightName.DIVERSITY);
    }

    feedExtractor(feed: Toot[]): StringNumberDict {
        // Shuffle the feed before penalizing multiple tooters
        // TODO: maybe reverse chronological order would be better?
        console.debug(`DiversityFeedScorer.feedExtractor() called...`);
        const sortRandom = (a: Toot, b: Toot) => md5(a.id).localeCompare(md5(b.id));

        // Count toots by account (but negative instead of positive count)
        const diversityTootsOrdered = feed.toSorted(sortRandom).reduce(
            (tootCounts, toot) => {
                incrementCount(tootCounts, toot.account.webfingerURI(), -1);
                if (toot.reblog?.account) incrementCount(tootCounts, toot.reblog.account.webfingerURI(), -1);
                return tootCounts;
            },
            {} as StringNumberDict
        );

        console.debug(`DiversityFeedScorer.feedExtractor() returning: ${JSON.stringify(diversityTootsOrdered, null, 4)}`);
        return diversityTootsOrdered;
    }

    // *NOTE: The penalty for frequent tooters decreases by 1 each time a toot is scored*
    //        As a result this.features must be reset anew each time the feed is scored
    async _score(toot: Toot) {
        incrementCount(this.requiredData, toot.account.webfingerURI());
        if (toot.reblog) incrementCount(this.requiredData, toot.reblog.account.webfingerURI());
        const acct = toot.reblog?.account?.webfingerURI() ?? toot.account.webfingerURI();

        // TODO: this was a hack to avoid wildly overscoring diversity values because of a bug that should be fixed now
        if (this.requiredData[acct] > 0) {
            let msg = `DiversityFeedScorer for ${toot.account.webfingerURI()} scored over 0 (${this.requiredData[toot.account.webfingerURI()]})`;
            console.warn(`${msg}, diversity features:\n${JSON.stringify(this.requiredData, null, 4)}`);
            return 0;
        } else {
            return this.requiredData[acct];
        }
    }
};
