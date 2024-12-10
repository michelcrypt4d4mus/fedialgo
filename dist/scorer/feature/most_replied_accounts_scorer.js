"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const feature_scorer_1 = __importDefault(require("../feature_scorer"));
const helpers_1 = require("../../helpers");
const api_1 = require("../../api/api");
const types_1 = require("../../types");
class MostRepliedAccountsScorer extends feature_scorer_1.default {
    constructor() {
        super(types_1.WeightName.MOST_REPLIED_ACCOUNTS);
    }
    async _score(toot) {
        return this.requiredData[toot.account.id] || 0;
    }
    // Count replied per user. Note that this does NOT pull the Account object because that
    // would require a lot of API calls, so it's just working with the account ID which is NOT
    // unique across all servers.
    async featureGetter() {
        const recentToots = await api_1.MastoApi.instance.getUserRecentToots();
        const recentReplies = recentToots.filter(toot => toot?.inReplyToAccountId);
        return (0, helpers_1.countValues)(recentReplies, (toot) => toot?.inReplyToAccountId);
    }
    ;
}
exports.default = MostRepliedAccountsScorer;
;
//# sourceMappingURL=most_replied_accounts_scorer.js.map