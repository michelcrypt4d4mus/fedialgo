"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Score how many times the toot has been replied to by other users.
 */
const feature_scorer_1 = __importDefault(require("../feature_scorer"));
const SCORE_NAME = "NumReplies";
class NumRepliesScorer extends feature_scorer_1.default {
    constructor() {
        super({
            description: "Favour toots with lots of replies",
            scoreName: SCORE_NAME,
        });
    }
    async _score(toot) {
        return toot?.repliesCount || 0;
    }
}
exports.default = NumRepliesScorer;
;
//# sourceMappingURL=numRepliesScorer.js.map