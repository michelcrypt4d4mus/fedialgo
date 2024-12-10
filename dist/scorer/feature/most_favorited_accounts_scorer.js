"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const feature_scorer_1 = __importDefault(require("../feature_scorer"));
const helpers_1 = require("../../helpers");
const types_1 = require("../../types");
const api_1 = require("../../api/api");
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
        const faves = (0, helpers_1.countValues)(recentFavourites, (toot) => toot.account?.acct);
        console.log(`Retrieved MostFavoritedAccountsScorer:`, faves);
        return faves;
    }
    ;
}
exports.default = MostFavoritedAccountsScorer;
;
//# sourceMappingURL=most_favorited_accounts_scorer.js.map