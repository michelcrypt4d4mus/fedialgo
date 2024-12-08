import { mastodon } from "masto";
import FeatureScorer from "../feature_scorer";
import { AccountFeature, Toot } from "../../types";
export default class InteractionsScorer extends FeatureScorer {
    constructor();
    _score(toot: Toot): Promise<number>;
    static fetchRequiredData(api: mastodon.rest.Client, _user: mastodon.v1.Account): Promise<AccountFeature>;
}
