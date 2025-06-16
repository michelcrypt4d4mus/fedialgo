import TootScorer from '../toot_scorer';
import Toot from '../../api/objects/toot';
import { type StringNumberDict } from '../../types';
export default class MentionsFollowedScorer extends TootScorer {
    description: string;
    constructor();
    prepareScoreData(): Promise<StringNumberDict>;
    _score(toot: Toot): Promise<number>;
}
