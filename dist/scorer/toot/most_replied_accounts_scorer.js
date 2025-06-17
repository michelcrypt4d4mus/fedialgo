"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const api_1 = __importDefault(require("../../api/api"));
const toot_scorer_1 = __importDefault(require("../toot_scorer"));
const collection_helpers_1 = require("../../helpers/collection_helpers");
const enums_1 = require("../../enums");
/**
 * Score how many times the user has replied to the creator of the toot.
 * @memberof module:toot_scorers
 * @augments Scorer
 */
class MostRepliedAccountsScorer extends toot_scorer_1.default {
    description = "Favour accounts you often reply to";
    constructor() {
        super(enums_1.ScoreName.MOST_REPLIED_ACCOUNTS);
    }
    // Count replied per user. Note that this does NOT pull the Account object because that
    // would require a lot of API calls, so it's just working with the account ID which is NOT
    // unique across all servers.
    async prepareScoreData() {
        const recentToots = await api_1.default.instance.getRecentUserToots();
        const recentReplies = recentToots.filter(toot => toot?.inReplyToAccountId);
        return (0, collection_helpers_1.countValues)(recentReplies, (toot) => toot?.inReplyToAccountId);
    }
    ;
    async _score(toot) {
        return (0, collection_helpers_1.sumArray)(toot.withRetoot.map(t => this.scoreData[t.account.id]));
    }
    ;
}
exports.default = MostRepliedAccountsScorer;
;
//# sourceMappingURL=most_replied_accounts_scorer.js.map