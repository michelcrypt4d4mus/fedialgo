import TootScorer from '../toot_scorer';
import type Toot from '../../api/objects/toot';
import { type StringNumberDict } from "../../types";
/**
 * Score {@linkcode Toot}s containing hashtags the user posts about a lot.
 * @memberof module:toot_scorers
 * @augments Scorer
 */
export default class HashtagParticipationScorer extends TootScorer {
    description: string;
    constructor();
    prepareScoreData(): Promise<StringNumberDict>;
    _score(toot: Toot): Promise<number>;
}
