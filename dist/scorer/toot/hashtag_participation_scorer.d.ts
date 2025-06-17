import Toot from '../../api/objects/toot';
import TootScorer from '../toot_scorer';
import { type StringNumberDict } from "../../types";
/**
 * Score toots containing hashtags the user posts about a lot.
 * @module toot_scorers
 */
export default class HashtagParticipationScorer extends TootScorer {
    description: string;
    constructor();
    prepareScoreData(): Promise<StringNumberDict>;
    _score(toot: Toot): Promise<number>;
}
