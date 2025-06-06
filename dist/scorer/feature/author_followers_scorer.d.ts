import FeatureScorer from "../feature_scorer";
import Toot from "../../api/objects/toot";
export default class AuthorFollowersScorer extends FeatureScorer {
    description: string;
    constructor();
    _score(toot: Toot): Promise<number>;
}
