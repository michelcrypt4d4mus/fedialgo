"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const FeatureScorer_1 = __importDefault(require("../FeatureScorer"));
const FeatureStore_1 = __importDefault(require("../../features/FeatureStore"));
const INTERACTIONS_DEFAULT_WEIGHT = 2;
class interactsFeatureScorer extends FeatureScorer_1.default {
    constructor() {
        super({
            featureGetter: (api) => { return FeatureStore_1.default.getTopInteracts(api); },
            verboseName: "Interacts",
            description: "Favor posts from users that most frequently interact with your posts",
            defaultWeight: INTERACTIONS_DEFAULT_WEIGHT,
        });
    }
    async score(_api, status) {
        return (status.account.acct in this.feature) ? this.feature[status.account.acct] : 0;
    }
}
exports.default = interactsFeatureScorer;
;
