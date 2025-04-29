"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Abstract extension of FeatureScorer to score a toot based on the account that created it
 */
const feature_scorer_1 = __importDefault(require("./feature_scorer"));
class AccountScorer extends feature_scorer_1.default {
    async _score(toot) {
        const score = this.scoreData[toot.account.webfingerURI] || 0;
        return score + (toot.reblog ? (this.scoreData[toot.reblog.account.webfingerURI] || 0) : 0);
    }
    ;
}
exports.default = AccountScorer;
;
//# sourceMappingURL=acccount_scorer.js.map