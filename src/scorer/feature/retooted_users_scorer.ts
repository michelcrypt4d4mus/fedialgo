/*
 * Score a toot based on how many times the user has retooted the author (or
 * the original author if it's a retoot).
 */
import { mastodon } from "masto";

import FeatureScorer from "../feature_scorer";
import Toot from '../../api/objects/toot';
import { countValues } from "../../helpers";
import { MastoApi } from "../../api/api";
import { StringNumberDict, WeightName } from "../../types";


// TODO: rename MostRetootedUsersScorer
export default class RetootedUsersScorer extends FeatureScorer {
    constructor() {
        super({
            featureGetter: () => RetootedUsersScorer.fetchRequiredData(),
            scoreName: WeightName.MOST_RETOOTED_ACCOUNTS,
        });
    }

    async _score(toot: Toot) {
        const authorScore = this.feature[toot.account.acct] || 0;
        const retootScore = toot.reblog?.account?.acct ? (this.feature[toot.reblog.account.acct] || 0) : 0;
        return authorScore + retootScore;
    }

    static async fetchRequiredData(): Promise<StringNumberDict> {
        const recentToots = await MastoApi.instance.getUserRecentToots();
        const recentRetoots = recentToots.filter(toot => toot?.reblog);
        console.log(`Recent toot history: `, recentToots);
        console.log(`Recent retoot history: `, recentRetoots);
        const retootCounts = countValues<mastodon.v1.Status>(recentRetoots, (toot) => toot?.reblog?.account?.acct);
        console.log(`Retoot counts:`, retootCounts);
        return retootCounts;
    };
};
