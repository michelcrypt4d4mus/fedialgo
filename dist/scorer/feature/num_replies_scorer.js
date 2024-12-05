"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Score how many times the toot has been replied to by other users.
 */
const feature_scorer_1 = __importDefault(require("../feature_scorer"));
const config_1 = require("../../config");
class NumRepliesScorer extends feature_scorer_1.default {
    constructor() {
        super({ scoreName: config_1.WeightName.NUM_REPLIES });
    }
    async _score(toot) {
        return toot?.repliesCount || 0;
    }
}
exports.default = NumRepliesScorer;
;
//# sourceMappingURL=num_replies_scorer.js.map