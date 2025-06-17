"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const toot_scorer_1 = __importDefault(require("../toot_scorer"));
const enums_1 = require("../../enums");
/**
 * Score how many times the toot has been replied to by other users.
 * @memberof toot_scorers
 * @augments Scorer
 */
class NumRepliesScorer extends toot_scorer_1.default {
    description = "Favour toots with lots of replies";
    constructor() {
        super(enums_1.ScoreName.NUM_REPLIES);
    }
    async _score(toot) {
        return toot.realToot.repliesCount || 0;
    }
}
exports.default = NumRepliesScorer;
;
//# sourceMappingURL=num_replies_scorer.js.map