"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const FeatureScorer_1 = __importDefault(require("../FeatureScorer"));
const mastodon_api_cache_1 = __importDefault(require("../../features/mastodon_api_cache"));
const Storage_1 = require("../../Storage");
class FavsFeatureScorer extends FeatureScorer_1.default {
    constructor() {
        super({
            description: "Favour accounts you often favourite",
            defaultWeight: 1,
            featureGetter: (api) => mastodon_api_cache_1.default.getMostFavoritedAccounts(api),
            scoreName: Storage_1.Key.TOP_FAVS,
        });
    }
    async _score(toot) {
        return (toot.account.acct in this.feature) ? this.feature[toot.account.acct] : 0;
    }
}
exports.default = FavsFeatureScorer;
;
//# sourceMappingURL=favsFeatureScorer.js.map