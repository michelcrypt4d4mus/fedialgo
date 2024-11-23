"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const FeatureScorer_1 = __importDefault(require("../FeatureScorer"));
const FeatureStore_1 = __importDefault(require("../../features/FeatureStore"));
class numFavoritesScorer extends FeatureScorer_1.default {
    constructor() {
        super({
            featureGetter: (api) => FeatureStore_1.default.getTopFavs(api),
            scoreName: "numFavorites",
            description: "Favor posts that have been favorited by a lot of other users",
            defaultWeight: 1,
        });
    }
    async score(_api, toot) {
        return toot?.favouritesCount || 0;
    }
}
exports.default = numFavoritesScorer;
;
//# sourceMappingURL=numFavoritesScorer.js.map