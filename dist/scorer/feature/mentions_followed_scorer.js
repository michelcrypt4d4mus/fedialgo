"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Score how many accounts that the user follows are mentioned in the toot.
 */
const account_1 = __importDefault(require("../../api/objects/account"));
const feature_scorer_1 = __importDefault(require("../feature_scorer"));
const api_1 = __importDefault(require("../../api/api"));
const types_1 = require("../../types");
class MentionsFollowedScorer extends feature_scorer_1.default {
    constructor() {
        super(types_1.WeightName.MENTIONS_FOLLOWED);
    }
    // Build simple dictionary of followed accounts (key is webfingerURI, value is 1)
    async prepareScoreData() {
        // TODO: this is duplicative of the followedAccounts prop in UserData (wastes some memory, but not much)
        return account_1.default.buildWebfingerUriLookup(await api_1.default.instance.getFollowedAccounts());
    }
    ;
    // Toot.repair() already made StatusMention.acct fields equivalent to Account.webfingerURI
    async _score(toot) {
        return toot.realToot().mentions.filter((m) => m.acct in this.scoreData).length;
    }
    ;
}
exports.default = MentionsFollowedScorer;
;
//# sourceMappingURL=mentions_followed_scorer.js.map