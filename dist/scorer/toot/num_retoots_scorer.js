"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const toot_scorer_1 = __importDefault(require("../toot_scorer"));
const enums_1 = require("../../enums");
/**
 * Score how many times the toot has been retooted.
 * @memberof toot_scorers
 */
class NumRetootsScorer extends toot_scorer_1.default {
    description = "Favour toots that are retooted a lot";
    constructor() {
        super(enums_1.ScoreName.NUM_RETOOTS);
    }
    async _score(toot) {
        return toot.realToot.reblogsCount || 0;
    }
}
exports.default = NumRetootsScorer;
;
//# sourceMappingURL=num_retoots_scorer.js.map