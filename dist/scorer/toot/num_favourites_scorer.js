"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const toot_scorer_1 = __importDefault(require("../toot_scorer"));
const enums_1 = require("../../enums");
class NumFavouritesScorer extends toot_scorer_1.default {
    description = "Favour toots favourited by your server's users";
    constructor() {
        super(enums_1.ScoreName.NUM_FAVOURITES);
    }
    async _score(toot) {
        return toot.realToot.favouritesCount || 0;
    }
}
exports.default = NumFavouritesScorer;
;
//# sourceMappingURL=num_favourites_scorer.js.map