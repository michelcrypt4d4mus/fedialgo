"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Score how many times the current user has favourited the tooter in the past.
 */
const acccount_scorer_1 = __importDefault(require("../acccount_scorer"));
const collection_helpers_1 = require("../../helpers/collection_helpers");
const api_1 = require("../../api/api");
const types_1 = require("../../types");
class MostFavoritedAccountsScorer extends acccount_scorer_1.default {
    constructor() {
        super(types_1.WeightName.FAVOURITED_ACCOUNTS);
    }
    ;
    async featureGetter() {
        const recentFavourites = await api_1.MastoApi.instance.fetchRecentFavourites();
        return (0, collection_helpers_1.countValues)(recentFavourites, (toot) => toot.account?.webfingerURI);
    }
    ;
}
exports.default = MostFavoritedAccountsScorer;
;
//# sourceMappingURL=most_favorited_accounts_scorer.js.map