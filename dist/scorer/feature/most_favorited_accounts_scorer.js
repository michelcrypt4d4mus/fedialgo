"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const feature_scorer_1 = __importDefault(require("../feature_scorer"));
const helpers_1 = require("../../helpers");
const api_1 = require("../../api/api");
const types_1 = require("../../types");
class MostFavoritedAccountsScorer extends feature_scorer_1.default {
    constructor() {
        super(types_1.WeightName.FAVOURITED_ACCOUNTS);
    }
    ;
    async featureGetter() {
        const recentFavourites = await api_1.MastoApi.instance.fetchRecentFavourites();
        return (0, helpers_1.countValues)(recentFavourites, (toot) => toot.account?.webfingerURI());
    }
    ;
    async _score(toot) {
        return this.requiredData[toot.account.webfingerURI()] || 0;
    }
    ;
}
exports.default = MostFavoritedAccountsScorer;
;
//# sourceMappingURL=most_favorited_accounts_scorer.js.map