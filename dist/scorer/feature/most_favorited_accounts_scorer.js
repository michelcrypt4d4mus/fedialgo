"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Score how many times the current user has favourited the tooter in the past.
 */
const account_1 = __importDefault(require("../../api/objects/account"));
const acccount_scorer_1 = __importDefault(require("../acccount_scorer"));
const api_1 = __importDefault(require("../../api/api"));
const types_1 = require("../../types");
class MostFavoritedAccountsScorer extends acccount_scorer_1.default {
    constructor() {
        super(types_1.WeightName.FAVOURITED_ACCOUNTS);
    }
    ;
    async prepareScoreData() {
        const recentFavourites = await api_1.default.instance.getRecentFavourites();
        return account_1.default.countAccounts(recentFavourites.map(toot => toot.account));
    }
    ;
}
exports.default = MostFavoritedAccountsScorer;
;
//# sourceMappingURL=most_favorited_accounts_scorer.js.map