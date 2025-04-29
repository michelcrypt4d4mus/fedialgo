"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Score how many times a toot has been retooted by other accounts in the feed.
 */
const feature_scorer_1 = __importDefault(require("../feature_scorer"));
const types_1 = require("../../types");
class RetootsInFeedScorer extends feature_scorer_1.default {
    constructor() {
        super(types_1.WeightName.RETOOTED_IN_FEED);
    }
    async _score(toot) {
        return toot.reblogsBy.length;
    }
}
exports.default = RetootsInFeedScorer;
;
//# sourceMappingURL=retoots_in_feed_scorer.js.map