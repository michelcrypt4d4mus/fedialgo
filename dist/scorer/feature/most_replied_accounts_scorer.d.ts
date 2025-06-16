import Toot from '../../api/objects/toot';
import TootScorer from '../feature_scorer';
import { type StringNumberDict } from '../../types';
export default class MostRepliedAccountsScorer extends TootScorer {
    description: string;
    constructor();
    prepareScoreData(): Promise<StringNumberDict>;
    _score(toot: Toot): Promise<number>;
}
