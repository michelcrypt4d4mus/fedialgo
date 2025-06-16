import Toot from '../../api/objects/toot';
import TootScorer from '../feature_scorer';
export default class RetootsInFeedScorer extends TootScorer {
    description: string;
    constructor();
    _score(toot: Toot): Promise<number>;
}
