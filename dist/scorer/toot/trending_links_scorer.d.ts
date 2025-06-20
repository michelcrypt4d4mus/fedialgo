import TootScorer from '../toot_scorer';
import type Toot from '../../api/objects/toot';
import { type StringNumberDict } from "../../types";
/**
 * Score toots based on the numAccounts of any trending links they contain.
 * @memberof module:toot_scorers
 * @augments Scorer
 */
export default class TrendingLinksScorer extends TootScorer {
    description: string;
    constructor();
    prepareScoreData(): Promise<StringNumberDict>;
    _score(toot: Toot): Promise<number>;
}
