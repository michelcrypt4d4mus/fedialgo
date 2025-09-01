"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const account_1 = __importDefault(require("../../api/objects/account"));
const acccount_scorer_1 = __importDefault(require("./acccount_scorer"));
const api_1 = __importDefault(require("../../api/api"));
const enums_1 = require("../../enums");
/**
 * Score how many times the current user has favourited the tooter in the past.
 * @memberof module:toot_scorers
 * @augments Scorer
 */
class MostFavouritedAccountsScorer extends acccount_scorer_1.default {
    description = "Favour accounts you often favourite";
    constructor() {
        super(enums_1.ScoreName.FAVOURITED_ACCOUNTS);
    }
    ;
    async prepareScoreData() {
        let favouritedToots = await api_1.default.instance.getFavouritedToots();
        favouritedToots = favouritedToots.filter(toot => !toot.isDM); // Ignore DMs
        return account_1.default.countAccounts(favouritedToots.map(toot => toot.account));
    }
    ;
}
exports.default = MostFavouritedAccountsScorer;
;
//# sourceMappingURL=most_favourited_accounts_scorer.js.map