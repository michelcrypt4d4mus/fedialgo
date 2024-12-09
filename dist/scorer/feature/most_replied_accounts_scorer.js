"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const feature_scorer_1 = __importDefault(require("../feature_scorer"));
const api_1 = require("../../api/api");
const types_1 = require("../../types");
class MostRepliedAccountsScorer extends feature_scorer_1.default {
    constructor() {
        super({
            featureGetter: () => MostRepliedAccountsScorer.fetchRequiredData(),
            scoreName: types_1.WeightName.MOST_REPLIED_ACCOUNTS,
        });
    }
    async _score(toot) {
        return this.feature[toot.account.id] || 0;
    }
    static async fetchRequiredData() {
        const recentToots = await api_1.MastoApi.instance.getUserRecentToots();
        const recentReplies = recentToots.filter(toot => toot?.inReplyToAccountId);
        console.log(`Recent reply history: `, recentReplies);
        // Count replied per user. Note that this does NOT pull the Account object because that
        // would require a lot of API calls, so it's just working with the account ID which is NOT
        // unique across all servers.
        return recentReplies.reduce((counts, toot) => {
            if (!toot?.inReplyToAccountId)
                return counts;
            counts[toot.inReplyToAccountId] = (counts[toot.inReplyToAccountId] || 0) + 1;
            return counts;
        }, {});
    }
    ;
}
exports.default = MostRepliedAccountsScorer;
;
//# sourceMappingURL=most_replied_accounts_scorer.js.map