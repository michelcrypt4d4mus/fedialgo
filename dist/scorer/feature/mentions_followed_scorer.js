"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const feature_scorer_1 = __importDefault(require("../feature_scorer"));
const collection_helpers_1 = require("../../helpers/collection_helpers");
const api_1 = require("../../api/api");
const types_1 = require("../../types");
class MentionsFollowedScorer extends feature_scorer_1.default {
    followedAccounts = [];
    constructor() {
        super(types_1.WeightName.MENTIONS_FOLLOWED);
    }
    // Build simple dictionary of followed accounts (key is webfingerURI(), value is 1)
    async featureGetter() {
        this.followedAccounts = await api_1.MastoApi.instance.fetchFollowedAccounts();
        return (0, collection_helpers_1.countValues)(this.followedAccounts, (account) => account.webfingerURI());
    }
    ;
    // Toot.repair() already made StatusMention.acct fields equivalent to Account.webfingerURI()
    async _score(toot) {
        return (toot.reblog || toot).mentions.filter((m) => m.acct in this.requiredData).length;
    }
    ;
}
exports.default = MentionsFollowedScorer;
;
//# sourceMappingURL=mentions_followed_scorer.js.map