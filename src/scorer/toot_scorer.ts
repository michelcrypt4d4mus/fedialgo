/**
 * Namespace for Scorers that operate on a Toot independent of the rest of the feed.
 * @module toot_scorers
 */

import Scorer from "./scorer";
import { ageString } from "../helpers/time_helpers";
import { ScoreName } from '../enums';
import { type StringNumberDict } from "../types";


/**
 * Base class for a Scorer that can score a toot based solely on the properties of that
 * toot, optionally coupled with the fedialgo user's account data. Most importantly a
 * TootScorer does *not* require information about any other Toots in the feed (unlike a FeedScorer,
 * which requires knowledge of the entire timeline to render a score).
 * @memberof module:toot_scorers
 * @augments Scorer
 */
export default abstract class TootScorer extends Scorer {
    constructor(scoreName: ScoreName) {
        super(scoreName);
    }

    /**
     * Calls this.prepareScoreData() to get any data required for scoring Toots later.
     * NOTE: Don't overload this - overload prepareScoreData() instead.
     */
    async fetchRequiredData(): Promise<void> {
        const startTime = Date.now();

        try {
            this.scoreData = await this.prepareScoreData();
        } catch (e) {
            this.logger.error(`Error in prepareScoreData():`, e);
            this.scoreData = {};
        }

        if (Object.values(this.scoreData).length > 0) {
            this.logger.debugWithTraceObjs(`prepareScoreData() finished ${ageString(startTime)}`, this.scoreData);
        }

        this.isReady = true;
    }

    /**
     * Can be overloaded in subclasses to set up any data required for scoring Toots.
     * @returns {StringNumberDict} Dictionary of data required for scoring Toots.
     */
    async prepareScoreData(): Promise<StringNumberDict> {
        return {};
    }
};
