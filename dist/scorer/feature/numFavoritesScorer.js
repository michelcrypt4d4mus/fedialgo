"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Score how many times the toot has been favorited by other users.
 * Note: favorites don't propagate across servers, so this is only useful for the
 * user's home server.
 */
const feature_scorer_1 = __importDefault(require("../feature_scorer"));
const SCORE_NAME = "NumFavourites";
// TODO: unclear whether favorites are pulled from servers other than the users' home server
class NumFavoritesScorer extends feature_scorer_1.default {
    constructor() {
        super({
            description: "Favour things favourited by users on your home server",
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