/*
 * Score a toot based on how many times the user has retooted the author (or
 * the original author if it's a retoot).
 */
import FeatureScorer from "../feature_scorer";
import Toot from '../../api/objects/toot';
import { countValues } from "../../helpers/collection_helpers";
import { MastoApi } from "../../api/api";
import { StringNumberDict, WeightName } from "../../types";


export default class MostRetootedUsersScorer extends FeatureScorer {
    constructor() {
        super(WeightName.MOST_RETOOTED_ACCOUNTS);
        this.scoresRetoots = true;
    }

    async featureGetter(): Promise<StringNumberDict> {
        const recentToots = await MastoApi.instance.getUserRecentToots();
        const recentRetoots = recentToots.filter(toot => toot?.reblog);
        return countValues<Toot>(recentRetoots, (toot) => toot.reblog?.account?.webfingerURI());
    };

    async _score(toot: Toot) {
        const authorScore = this.requiredData[toot.account.webfingerURI()] || 0;
        const retootScore = this.requiredData[toot.reblog?.account?.webfingerURI() || "NONE"] || 0;
        return authorScore + retootScore;
    };
};
