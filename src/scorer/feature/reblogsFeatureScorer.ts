/*
 * Score a toot based on how many times the user has reblogged the author (or the original
 * author if it's a retoot).
 */
import { mastodon } from "masto";

import FeatureScorer from "../FeatureScorer";
import FeatureStorage from "../../features/FeatureStore";
import { Toot } from "../../types";

const DEFAULT_RETOOTED_USER_WEIGHT = 3;


// TODO: rename retootsFeatureScorer
export default class reblogsFeatureScorer extends FeatureScorer {
    constructor() {
        super({
            description: "Favor posts from accounts you have retooted a lot",
            defaultWeight: DEFAULT_RETOOTED_USER_WEIGHT,
            featureGetter: (api: mastodon.rest.Client) => FeatureStorage.getTopReblogs(api),
            scoreName: "Reblogs",
        })
    }

    async score(_api: mastodon.rest.Client, toot: Toot) {
        const authorScore = (toot.account.acct in this.feature) ? this.feature[toot.account.acct] : 0;
        let reblogScore: number = 0;

        if (toot.reblog && toot.reblog.account.acct in this.feature) {
            reblogScore = this.feature[toot.reblog.account.acct];
        }

        return authorScore + reblogScore;
    }
};
