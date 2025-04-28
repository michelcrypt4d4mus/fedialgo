"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Score how many times the toot has been favourited by other users.
 * Note: favorites don't propagate across servers, so this is only useful for the
 * user's home server.
 */
const feature_scorer_1 = __importDefault(require("../feature_scorer"));
const types_1 = require("../../types");
class NumFavoritesScorer extends feature_scorer_1.default {
    constructor() {
        super(types_1.WeightName.NUM_FAVOURITES);
    }
    async _score(toot) {
        return (toot.reblog || toot).favouritesCount || 0;
    }
}
exports.default = NumFavoritesScorer;
;
//# sourceMappingURL=num_favorites_scorer.js.map