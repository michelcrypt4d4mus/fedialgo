"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const feature_scorer_1 = __importDefault(require("../feature_scorer"));
const api_1 = require("../../api/api");
const types_1 = require("../../types");
class MostFavoritedAccountsScorer extends feature_scorer_1.default {
    constructor() {
        super({
            featureGetter: () => MostFavoritedAccountsScorer.fetchRequiredData(),
            scoreName: types_1.WeightName.FAVORITED_ACCOUNTS
        });
    }
    async _score(toot) {
        return (toot.account.acct in this.feature) ? this.feature[toot.account.acct] : 0;
    }
    static async fetchRequiredData() {
        const recentFavourites = await api_1.MastoApi.instance.fetchRecentFavourites();
        console.log(`Retrieved faves with MostFavoritedAccounts() : `, recentFavourites);
        return recentFavourites.reduce((favouriteCounts, toot) => {
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