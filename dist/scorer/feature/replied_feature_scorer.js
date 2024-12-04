"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const feature_scorer_1 = __importDefault(require("../feature_scorer"));
const mastodon_api_cache_1 = __importDefault(require("../../api/mastodon_api_cache"));
const Storage_1 = require("../../Storage");
class RepliedFeatureScorer extends feature_scorer_1.default {
    constructor() {
        super({
            description: "Favour accounts you often reply to",
            featureGetter: (api) => mastodon_api_cache_1.default.getMostRepliedAccounts(api),
            scoreName: Storage_1.Key.REPLIED_TO,
        });
    }
    async _score(toot) {
        return this.feature[toot.account.id] || 0;
    }
}
exports.default = RepliedFeatureScorer;
;
//# sourceMappingURL=replied_feature_scorer.js.map