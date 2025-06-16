"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * One point if you follow the account (retoots by followed accounts are picked up by the
 * RetootsInFeedScorer).
 */
const account_1 = __importDefault(require("../../api/objects/account"));
const api_1 = __importDefault(require("../../api/api"));
const feature_scorer_1 = __importDefault(require("../feature_scorer"));
const enums_1 = require("../../enums");
class FollowedAccountsScorer extends feature_scorer_1.default {
    description = "Favour accounts you follow";
    constructor() {
        super(enums_1.ScoreName.FOLLOWED_ACCOUNTS);
    }
    ;
    async prepareScoreData() {
        return account_1.default.countAccounts(await api_1.default.instance.getFollowedAccounts());
    }
    ;
    async _score(toot) {
        return this.scoreData[toot.account.webfingerURI] ?? 0;
    }
}
exports.default = FollowedAccountsScorer;
;
//# sourceMappingURL=followed_accounts_scorer.js.map