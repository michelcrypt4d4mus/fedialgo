"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Score how many times the toot has been retooted.
 */
const feature_scorer_1 = __importDefault(require("../feature_scorer"));
const SCORE_NAME = "NumRetoots";
class NumRetootsScorer extends feature_scorer_1.default {
    constructor() {
        super({
            description: "Favour oft retooted toots",
            scoreName: SCORE_NAME,
        });
    }
    async _score(toot) {
        return toot?.reblogsCount || 0;
    }
}
exports.default = NumRetootsScorer;
;
//# sourceMappingURL=num_retoots_scorer.js.map