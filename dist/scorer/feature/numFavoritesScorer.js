"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const FeatureScorer_1 = __importDefault(require("../FeatureScorer"));
class numFavoritesScorer extends FeatureScorer_1.default {
    constructor() {
        super({
            description: "Favor posts that have been favorited by a lot of other users",
            defaultWeight: 1,
            scoreName: "numFavorites",
        });
    }
    async score(_api, toot) {
        return toot?.favouritesCount || 0;
    }
}
exports.default = numFavoritesScorer;
;
//# sourceMappingURL=numFavoritesScorer.js.map