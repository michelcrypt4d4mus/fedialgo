"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const feature_scorer_1 = __importDefault(require("../feature_scorer"));
const mastodon_api_cache_1 = __importDefault(require("../../api/mastodon_api_cache"));
const types_1 = require("../../types");
class FavsFeatureScorer extends feature_scorer_1.default {
    constructor() {
        super({
            featureGetter: (api) => mastodon_api_cache_1.default.getMostFavoritedAccounts(api),
            scoreName: types_1.WeightName.FAVORITED_ACCOUNTS
        });
    }
    async _score(toot) {
        return (toot.account.acct in this.feature) ? this.feature[toot.account.acct] : 0;
    }
}
exports.default = FavsFeatureScorer;
;
//# sourceMappingURL=favsFeatureScorer.js.map