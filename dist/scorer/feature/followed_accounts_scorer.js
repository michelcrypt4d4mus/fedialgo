"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * One point for each of the original poster and retooter that the user follows.
 */
const account_1 = __importDefault(require("../../api/objects/account"));
const feature_scorer_1 = __importDefault(require("../feature_scorer"));
const api_1 = __importDefault(require("../../api/api"));
const types_1 = require("../../types");
class FollowedAccountsScorer extends feature_scorer_1.default {
    description = "Favour accounts you follow";
    constructor() {
        super(types_1.ScoreName.FOLLOWED_ACCOUNTS);
    }
    ;
    async prepareScoreData() {
        return account_1.default.countAccounts(await api_1.default.instance.getFollowedAccounts());
    }
    ;
    async _score(toot) {
        let _score = this.scoreData[toot.account.webfingerURI];
        return _score + (toot.reblog ? this.scoreData[toot.reblog?.account.webfingerURI] : 0);
    }
}
exports.default = FollowedAccountsScorer;
;
//# sourceMappingURL=followed_accounts_scorer.js.map