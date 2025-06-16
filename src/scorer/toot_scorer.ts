/*
 * Base class for a Scorer that can score a toot based solely on the properties of that
 * toot, optionally coupled with the fedialgo user's account data. Most importantly a
 * TootScorer does *not* require information about any other Toots in the feed (unlike a FeedScorer,
 * which requires knowledge of the entire timeline to render a score).
 */
import Scorer from "./scorer";
import { ageString } from "../helpers/time_helpers";
import { isDebugMode } from "../helpers/environment_helpers";
import { ScoreName } from '../enums';
import { type StringNumberDict } from "../types";


export default abstract class TootScorer extends Scorer {
    constructor(scoreName: ScoreName) {
        super(scoreName);
    }

    // Calls this.prepareScoreData() to get any data required for scoring Toots later.
    // Don't overload this - overload prepareScoreData() instead.
    async fetchRequiredData(): Promise<void> {
        const startTime = Date.now();

        try {
            this.scoreData = await this.prepareScoreData();
        } catch (e) {
            this.logger.error(`Error in prepareScoreData():`, e);
            this.scoreData = {};
        }

        if (Object.values(this.scoreData).length > 0) {
            const msg = `prepareScoreData() finished ${ageString(startTime)}`;
            this.logger.debug(`${msg}, returned:`, isDebugMode ? this.scoreData : `[enable debug mode to see]`);
        }

        this.isReady = true;
    }

    // Can be overloaded in subclasses to set up any data required for scoring Toots
    async prepareScoreData(): Promise<StringNumberDict> {
        return {};
    }
};
