import FeatureScorer from "../feature_scorer";
import Toot from '../../api/objects/toot';
import { StringNumberDict } from "../../types";
export default class MostRetootedUsersScorer extends FeatureScorer {
    constructor();
    featureGetter(): Promise<StringNumberDict>;
    _score(toot: Toot): Promise<number>;
}
