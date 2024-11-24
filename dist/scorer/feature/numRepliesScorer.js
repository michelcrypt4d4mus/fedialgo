"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const FeatureScorer_1 = __importDefault(require("../FeatureScorer"));
class numRepliesScorer extends FeatureScorer_1.default {
    constructor() {
        super({
            description: "Favor toots that have been replied to many times",
            defaultWeight: 1,
            scoreName: "numReplies",
        });
    }
    async score(toot) {
        return toot?.repliesCount || 0;
    }
}
exports.default = numRepliesScorer;
;
//# sourceMappingURL=numRepliesScorer.js.map