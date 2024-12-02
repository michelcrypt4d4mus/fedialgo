"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const FeatureScorer_1 = __importDefault(require("../FeatureScorer"));
const mastodon_api_cache_1 = __importDefault(require("../../features/mastodon_api_cache"));
const Storage_1 = require("../../Storage");
class RepliedFeatureScorer extends FeatureScorer_1.default {
    constructor() {
        super({
            description: "Favour toots from accounts you often reply to",
            defaultWeight: 1,
            featureGetter: (api) => mastodon_api_cache_1.default.getMostRepliedAccounts(api),
            scoreName: Storage_1.Key.REPLIED_TO,
        });
    }
    async score(toot) {
        return this.feature[toot.account.id] || 0;
    }
}
exports.default = RepliedFeatureScorer;
;
//# sourceMappingURL=repied_feature_scorer.js.map