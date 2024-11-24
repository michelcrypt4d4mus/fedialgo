"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const FeatureScorer_1 = __importDefault(require("../FeatureScorer"));
const FeatureStore_1 = __importDefault(require("../../features/FeatureStore"));
const INTERACTIONS_DEFAULT_WEIGHT = 2;
const SCORE_NAME = "Interactions";
class InteractionsFeatureScorer extends FeatureScorer_1.default {
    constructor() {
        super({
            description: "Favour toots from users that interact with your toots",
            defaultWeight: INTERACTIONS_DEFAULT_WEIGHT,
            featureGetter: (api) => FeatureStore_1.default.getTopInteracts(api),
            scoreName: SCORE_NAME,
        });
    }
    async score(toot) {
        return (toot.account.acct in this.feature) ? this.feature[toot.account.acct] : 0;
    }
}
exports.default = InteractionsFeatureScorer;
;
//# sourceMappingURL=InteractionsFeatureScorer.js.map