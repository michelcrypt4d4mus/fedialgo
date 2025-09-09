"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const account_1 = __importDefault(require("../../api/objects/account"));
const acccount_scorer_1 = __importDefault(require("./acccount_scorer"));
const api_1 = __importDefault(require("../../api/api"));
const toot_1 = __importDefault(require("../../api/objects/toot"));
const enums_1 = require("../../enums");
/**
 * Score a {@linkcode Toot} based on how many times the user has retooted the author and retooter
 * (if it's a retoot).
 * @memberof module:toot_scorers
 * @augments Scorer
 */
class MostRetootedAccountsScorer extends acccount_scorer_1.default {
    description = "Favour accounts you often retoot";
    constructor() {
        super(enums_1.ScoreName.MOST_RETOOTED_ACCOUNTS);
    }
    async prepareScoreData() {
        const recentToots = await api_1.default.instance.getRecentUserToots();
        const retootedAccounts = toot_1.default.onlyRetoots(recentToots).map(toot => toot.reblog.account);
        return account_1.default.countAccounts(retootedAccounts);
    }
    ;
}
exports.default = MostRetootedAccountsScorer;
;
//# sourceMappingURL=most_retooted_accounts_scorer.js.map