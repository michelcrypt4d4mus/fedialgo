"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const FeatureScorer_1 = __importDefault(require("../FeatureScorer"));
const FeatureStore_1 = __importDefault(require("../../features/FeatureStore"));
const DEFAULT_RETOOTED_USER_WEIGHT = 3;
const SCORE_NAME = "MostRetootedAccounts";
// TODO: rename retootedUsersFeatureScorer
class reblogsFeatureScorer extends FeatureScorer_1.default {
    constructor() {
        super({
            description: "Favour toots from accounts you have retooted a lot",
            defaultWeight: DEFAULT_RETOOTED_USER_WEIGHT,
            featureGetter: (api) => FeatureStore_1.default.getMostRetootedAccounts(api),
            scoreName: SCORE_NAME,
        });
    }
    async score(toot) {
        const authorScore = this.feature[toot.account.acct] || 0;
        const retootScore = toot.reblog?.account?.acct ? (this.feature[toot.reblog.account.acct] || 0) : 0;
        return authorScore + retootScore;
    }
}
exports.default = reblogsFeatureScorer;
;
//# sourceMappingURL=reblogsFeatureScorer.js.map