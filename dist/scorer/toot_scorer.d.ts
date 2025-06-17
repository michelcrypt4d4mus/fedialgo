import Scorer from "./scorer";
import { ScoreName } from '../enums';
import { type StringNumberDict } from "../types";
/**
 * Namespace for Scorers that operate on a Toot independent of the rest of the feed.
 * @namespace toot_scorers
 */
/**
 * Base class for a Scorer that can score a toot based solely on the properties of that
 * toot, optionally coupled with the fedialgo user's account data. Most importantly a
 * TootScorer does *not* require information about any other Toots in the feed (unlike a FeedScorer,
 * which requires knowledge of the entire timeline to render a score).
 * @memberof toot_scorers
 */
export default abstract class TootScorer extends Scorer {
    constructor(scoreName: ScoreName);
    fetchRequiredData(): Promise<void>;
    prepareScoreData(): Promise<StringNumberDict>;
}
