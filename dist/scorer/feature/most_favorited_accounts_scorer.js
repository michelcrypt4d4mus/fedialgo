"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const feature_scorer_1 = __importDefault(require("../feature_scorer"));
const mastodon_api_cache_1 = __importDefault(require("../../api/mastodon_api_cache"));
const api_1 = require("../../api/api");
const types_1 = require("../../types");
class MostFavoritedAccountsScorer extends feature_scorer_1.default {
    constructor() {
        super({
            featureGetter: (api) => mastodon_api_cache_1.default.getMostFavoritedAccounts(api),
            scoreName: types_1.WeightName.FAVORITED_ACCOUNTS
        });
    }
    async _score(toot) {
        return (toot.account.acct in this.feature) ? this.feature[toot.account.acct] : 0;
    }
    static async fetchRequiredData(api, _user) {
        const results = await (0, api_1.mastodonFetchPages)({
            fetch: api.v1.favourites.list,
            label: types_1.WeightName.FAVORITED_ACCOUNTS
        });
        console.log(`Retrieved faves with MostFavoritedAccounts() AND mastodonFetchPages(): `, results);
        return results.reduce((favouriteCounts, toot) => {
            if (!toot.account)
                return favouriteCounts;
            favouriteCounts[toot.account.acct] = (favouriteCounts[toot.account.acct] || 0) + 1;
            return favouriteCounts;
        }, {});
    }
    ;
}
exports.default = MostFavoritedAccountsScorer;
;
//# sourceMappingURL=most_favorited_accounts_scorer.js.map