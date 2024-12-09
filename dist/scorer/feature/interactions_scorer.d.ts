import FeatureScorer from "../feature_scorer";
import Toot from '../../api/objects/toot';
import { AccountFeature } from "../../types";
export default class InteractionsScorer extends FeatureScorer {
    constructor();
    _score(toot: Toot): Promise<number>;
    static fetchRequiredData(): Promise<AccountFeature>;
}
