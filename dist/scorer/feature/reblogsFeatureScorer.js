"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const FeatureScorer_1 = __importDefault(require("../FeatureScorer"));
const FeatureStore_1 = __importDefault(require("../../features/FeatureStore"));
const DEFAULT_RETOOTED_USER_WEIGHT = 3;
// TODO: rename retootsFeatureScorer
class reblogsFeatureScorer extends FeatureScorer_1.default {
    constructor() {
        super({
            description: "Favor toots from accounts you have retooted a lot",
            defaultWeight: DEFAULT_RETOOTED_USER_WEIGHT,
            featureGetter: (api) => FeatureStore_1.default.getTopReblogs(api),
            scoreName: "Reblogs",
        });
    }
    async score(toot) {
        const authorScore = (toot.account.acct in this.feature) ? this.feature[toot.account.acct] : 0;
        let reblogScore = 0;
        if (toot.reblog && toot.reblog.account.acct in this.feature) {
            reblogScore = this.feature[toot.reblog.account.acct];
        }
        return authorScore + reblogScore;
    }
}
exports.default = reblogsFeatureScorer;
;
//# sourceMappingURL=reblogsFeatureScorer.js.map