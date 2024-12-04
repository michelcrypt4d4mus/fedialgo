"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const feature_scorer_1 = __importDefault(require("../feature_scorer"));
const mastodon_api_cache_1 = __importDefault(require("../../features/mastodon_api_cache"));
const Storage_1 = require("../../Storage");
const INTERACTIONS_DEFAULT_WEIGHT = 2;
class InteractionsFeatureScorer extends feature_scorer_1.default {
    constructor() {
        super({
            description: "Favour accounts that recently interacted with your toots",
            defaultWeight: INTERACTIONS_DEFAULT_WEIGHT,
            featureGetter: (api) => mastodon_api_cache_1.default.getTopInteracts(api),
            scoreName: Storage_1.Key.TOP_INTERACTS,
        });
    }
    async _score(toot) {
        return (toot.account.acct in this.feature) ? this.feature[toot.account.acct] : 0;
    }
}
exports.default = InteractionsFeatureScorer;
;
//# sourceMappingURL=InteractionsFeatureScorer.js.map