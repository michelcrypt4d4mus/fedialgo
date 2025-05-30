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
const scorer_1 = require("../scorer");
class NumFavouritesScorer extends feature_scorer_1.default {
    description = "Favour toots favourited by your server's users";
    constructor() {
        super(scorer_1.ScoreName.NUM_FAVOURITES);
    }
    async _score(toot) {
        return toot.realToot().favouritesCount || 0;
    }
}
exports.default = NumFavouritesScorer;
;
//# sourceMappingURL=num_favourites_scorer.js.map