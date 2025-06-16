import TootScorer from '../feature_scorer';
import Toot from '../../api/objects/toot';
import { type StringNumberDict } from "../../types";
export default class TrendingLinksScorer extends TootScorer {
    description: string;
    constructor();
    prepareScoreData(): Promise<StringNumberDict>;
    _score(toot: Toot): Promise<number>;
}
