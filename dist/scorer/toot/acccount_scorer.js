"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Abstract extension of FeatureScorer to score a toot based on the account that created it.
 * Requires that the scoreData is a map of webfingerURIs to scores.
 */
const toot_scorer_1 = __importDefault(require("../toot_scorer"));
const collection_helpers_1 = require("../../helpers/collection_helpers");
/**
 * @private
 */
class AccountScorer extends toot_scorer_1.default {
    async _score(toot) {
        return (0, collection_helpers_1.sumArray)(toot.withRetoot.map(t => this.scoreData[t.account.webfingerURI]));
    }
    ;
}
exports.default = AccountScorer;
;
//# sourceMappingURL=acccount_scorer.js.map