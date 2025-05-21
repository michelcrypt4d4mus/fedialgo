"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Score a toot based on how many times the user has retooted the author (or
 * the original author if it's a retoot).
 */
const account_1 = __importDefault(require("../../api/objects/account"));
const acccount_scorer_1 = __importDefault(require("../acccount_scorer"));
const api_1 = __importDefault(require("../../api/api"));
const types_1 = require("../../types");
class MostRetootedAccountsScorer extends acccount_scorer_1.default {
    constructor() {
        super(types_1.ScoreName.MOST_RETOOTED_ACCOUNTS);
    }
    async prepareScoreData() {
        const recentToots = await api_1.default.instance.getRecentUserToots();
        const retootedAccounts = recentToots.filter(toot => toot?.reblog).map(toot => toot.reblog.account);
        return account_1.default.countAccounts(retootedAccounts);
    }
    ;
}
exports.default = MostRetootedAccountsScorer;
;
//# sourceMappingURL=most_retooted_accounts_scorer.js.map