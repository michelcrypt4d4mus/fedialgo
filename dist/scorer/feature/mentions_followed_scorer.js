"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const feature_scorer_1 = __importDefault(require("../feature_scorer"));
const helpers_1 = require("../../helpers");
const api_1 = require("../../api/api");
const types_1 = require("../../types");
class MentionsFollowedScorer extends feature_scorer_1.default {
    followedAccounts = [];
    constructor() {
        super(types_1.WeightName.MENTIONS_FOLLOWED);
    }
    // Count replied per user. Note that this does NOT pull the Account object because that
    // would require a lot of API calls, so it's just working with the account ID which is NOT
    // unique across all servers.
    async featureGetter() {
        this.followedAccounts = await api_1.MastoApi.instance.fetchFollowedAccounts();
        return (0, helpers_1.countValues)(this.followedAccounts, (account) => account.webfingerURI());
    }
    ;
    // TODO: Needs equivalent of webfingerURI or won't always work correctly.
    async _score(toot) {
        return toot.mentions.filter((mention) => mention.acct in this.requiredData).length;
    }
    ;
}
exports.default = MentionsFollowedScorer;
;
//# sourceMappingURL=mentions_followed_scorer.js.map