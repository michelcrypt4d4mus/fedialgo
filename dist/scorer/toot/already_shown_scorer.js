"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @memberof module:toot_scorers
 */
const toot_scorer_1 = __importDefault(require("../toot_scorer"));
const enums_1 = require("../../enums");
const collection_helpers_1 = require("../../helpers/collection_helpers");
/**
 * Score based on the numTimesShown, which is managed by the client app.
 * @class AlreadyShownScorer
 * @memberof module:toot_scorers
 * @augments Scorer
 */
class AlreadyShownScorer extends toot_scorer_1.default {
    description = 'Favour toots marked as already seen';
    constructor() {
        super(enums_1.ScoreName.ALREADY_SHOWN);
    }
    // Sets the followedTags property on the Toot object before returning the score
    async _score(toot) {
        return (0, collection_helpers_1.sumArray)(toot.withRetoot.map(t => t.numTimesShown));
    }
}
exports.default = AlreadyShownScorer;
;
//# sourceMappingURL=already_shown_scorer.js.map