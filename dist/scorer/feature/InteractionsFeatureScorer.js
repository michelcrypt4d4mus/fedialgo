"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const FeatureScorer_1 = __importDefault(require("../FeatureScorer"));
const FeatureStore_1 = __importDefault(require("../../features/FeatureStore"));
const INTERACTIONS_DEFAULT_WEIGHT = 2;
class InteractionsFeatureScorer extends FeatureScorer_1.default {
    constructor() {
        super({
            description: "Favor toots from users that most frequently interact with your posts",
            defaultWeight: INTERACTIONS_DEFAULT_WEIGHT,
            featureGetter: (api) => FeatureStore_1.default.getTopInteracts(api),
            scoreName: "Interacts",
        });
    }
    async score(toot) {
        return (toot.account.acct in this.feature) ? this.feature[toot.account.acct] : 0;
    }
}
exports.default = InteractionsFeatureScorer;
;
//# sourceMappingURL=InteractionsFeatureScorer.js.map