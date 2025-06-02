"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Score how many times the current user has favourited the tooter in the past.
 */
const account_1 = __importDefault(require("../../api/objects/account"));
const acccount_scorer_1 = __importDefault(require("./acccount_scorer"));
const api_1 = __importDefault(require("../../api/api"));
const enums_1 = require("../../enums");
class MostFavouritedAccountsScorer extends acccount_scorer_1.default {
    description = "Favour accounts you often favourite";
    constructor() {
        super(enums_1.ScoreName.FAVOURITED_ACCOUNTS);
    }
    ;
    async prepareScoreData() {
        return await MostFavouritedAccountsScorer.getFavouritedAccounts();
    }
    ;
    static buildFavouritedAccounts(favourites) {
        return account_1.default.countAccounts(favourites.map(toot => toot.account));
    }
    static async getFavouritedAccounts() {
        return this.buildFavouritedAccounts(await api_1.default.instance.getFavouritedToots());
    }
}
exports.default = MostFavouritedAccountsScorer;
;
//# sourceMappingURL=most_favourited_accounts_scorer.js.map