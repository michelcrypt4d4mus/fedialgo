"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Score how many times the toot has been favorited by other users.
 */
const feature_scorer_1 = __importDefault(require("../feature_scorer"));
const SCORE_NAME = "NumFavourites";
// TODO: unclear whether favorites are pulled from servers other than the users' home server
class NumFavoritesScorer extends feature_scorer_1.default {
    constructor() {
        super({
            description: "Favour things favourited by a lot of other users",
            scoreName: SCORE_NAME,
        });
    }
    async _score(toot) {
        return toot?.favouritesCount || 0;
    }
}
exports.default = NumFavoritesScorer;
;
//# sourceMappingURL=numFavoritesScorer.js.map