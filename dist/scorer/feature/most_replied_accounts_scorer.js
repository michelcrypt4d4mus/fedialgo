"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Score how many times the user has replied to the creator of the toot.
 */
const feature_scorer_1 = __importDefault(require("../feature_scorer"));
const collection_helpers_1 = require("../../helpers/collection_helpers");
const api_1 = __importDefault(require("../../api/api"));
const types_1 = require("../../types");
class MostRepliedAccountsScorer extends feature_scorer_1.default {
    constructor() {
        super(types_1.WeightName.MOST_REPLIED_ACCOUNTS);
    }
    // Count replied per user. Note that this does NOT pull the Account object because that
    // would require a lot of API calls, so it's just working with the account ID which is NOT
    // unique across all servers.
    async prepareScoreData() {
        const recentToots = await api_1.default.instance.getUserRecentToots();
        const recentReplies = recentToots.filter(toot => toot?.inReplyToAccountId);
        return (0, collection_helpers_1.countValues)(recentReplies, (toot) => toot?.inReplyToAccountId);
    }
    ;
    async _score(toot) {
        const score = this.scoreData[toot.account.id] || 0;
        return score + (toot.reblog ? (this.scoreData[toot.reblog.account.id] || 0) : 0);
    }
    ;
}
exports.default = MostRepliedAccountsScorer;
;
//# sourceMappingURL=most_replied_accounts_scorer.js.map