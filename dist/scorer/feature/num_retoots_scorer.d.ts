import Toot from '../../api/objects/toot';
import TootScorer from '../feature_scorer';
export default class NumRetootsScorer extends TootScorer {
    description: string;
    constructor();
    _score(toot: Toot): Promise<number>;
}
