"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const FeatureScorer_1 = __importDefault(require("../FeatureScorer"));
const mastodon_api_cache_1 = __importDefault(require("../../features/mastodon_api_cache"));
const Storage_1 = require("../../Storage");
const DEFAULT_RETOOTED_USER_WEIGHT = 3;
// TODO: rename retootedUsersFeatureScorer
class ReblogsFeatureScorer extends FeatureScorer_1.default {
    constructor() {
        super({
            description: "Favour toots from accounts you have retooted a lot",
            defaultWeight: DEFAULT_RETOOTED_USER_WEIGHT,
            featureGetter: (api) => mastodon_api_cache_1.default.getMostRetootedAccounts(api),
            scoreName: Storage_1.Key.TOP_REBLOGS,
        });
    }
    async score(toot) {
        const authorScore = this.feature[toot.account.acct] || 0;
        const retootScore = toot.reblog?.account?.acct ? (this.feature[toot.reblog.account.acct] || 0) : 0;
        return authorScore + retootScore;
    }
}
exports.default = ReblogsFeatureScorer;
;
//# sourceMappingURL=reblogsFeatureScorer.js.map