"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Score how many times the toot has been favorited by other users.
 */
const FeatureScorer_1 = __importDefault(require("../FeatureScorer"));
const SCORE_NAME = "NumFavourites";
// TODO: unclear whether favorites are pulled from servers other than the users' home server
class NumFavoritesScorer extends FeatureScorer_1.default {
    constructor() {
        super({
            description: "Favour toots that have been favourited by a lot of other users",
            defaultWeight: 1,
            scoreName: SCORE_NAME,
        });
    }
    async score(toot) {
        return toot?.favouritesCount || 0;
    }
}
exports.default = NumFavoritesScorer;
;
//# sourceMappingURL=numFavoritesScorer.js.map