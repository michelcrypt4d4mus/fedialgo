"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const feature_scorer_1 = __importDefault(require("../feature_scorer"));
const mastodon_api_cache_1 = __importDefault(require("../../api/mastodon_api_cache"));
const types_1 = require("../../types");
const DEFAULT_RETOOTED_USER_WEIGHT = 3;
class RetootedUsersScorer extends feature_scorer_1.default {
    constructor() {
        super({
            featureGetter: (api) => mastodon_api_cache_1.default.getMostRetootedAccounts(api),
            scoreName: types_1.WeightName.MOST_RETOOTED_ACCOUNTS,
        });
    }
    async _score(toot) {
        const authorScore = this.feature[toot.account.acct] || 0;
        const retootScore = toot.reblog?.account?.acct ? (this.feature[toot.reblog.account.acct] || 0) : 0;
        return authorScore + retootScore;
    }
}
exports.default = RetootedUsersScorer;
;
//# sourceMappingURL=retooted_users_scorer.js.map