import FeatureScorer from "../feature_scorer";
import Toot from '../../api/objects/toot';
export default class RetootedUsersScorer extends FeatureScorer {
    constructor();
    _score(toot: Toot): Promise<number>;
    static fetchRequiredData(): Promise<Record<string, number>>;
}
