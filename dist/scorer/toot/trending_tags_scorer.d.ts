import Toot from '../../api/objects/toot';
import TootScorer from '../toot_scorer';
export default class TrendingTagsScorer extends TootScorer {
    description: string;
    constructor();
    _score(toot: Toot): Promise<number>;
}
