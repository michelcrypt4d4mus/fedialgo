"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const FeatureScorer_1 = __importDefault(require("../FeatureScorer"));
const FeatureStore_1 = __importDefault(require("../../features/FeatureStore"));
class favsFeatureScorer extends FeatureScorer_1.default {
    constructor() {
        super({
            description: "Favor posts from users whose posts you have favorited a lot in the past",
            defaultWeight: 1,
            featureGetter: (api) => FeatureStore_1.default.getTopFavs(api),
            scoreName: "Favs",
        });
    }
    async score(toot) {
        return (toot.account.acct in this.feature) ? this.feature[toot.account.acct] : 0;
    }
}
exports.default = favsFeatureScorer;
;
//# sourceMappingURL=favsFeatureScorer.js.map