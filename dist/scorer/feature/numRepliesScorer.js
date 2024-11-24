"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Score how many times the toot has been replied to by other users.
 */
const FeatureScorer_1 = __importDefault(require("../FeatureScorer"));
const SCORE_NAME = "NumReplies";
class NumRepliesScorer extends FeatureScorer_1.default {
    constructor() {
        super({
            description: "Favour toots that have been replied to many times",
            defaultWeight: 1,
            scoreName: SCORE_NAME,
        });
    }
    async score(toot) {
        return toot?.repliesCount || 0;
    }
}
exports.default = NumRepliesScorer;
;
//# sourceMappingURL=numRepliesScorer.js.map