"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Score how many times the toot has been favorited by other users.
 */
const FeatureScorer_1 = __importDefault(require("../FeatureScorer"));
const FeatureStore_1 = __importDefault(require("../../features/FeatureStore"));
class numFavoritesScorer extends FeatureScorer_1.default {
    constructor() {
        super({
            featureGetter: (api) => FeatureStore_1.default.getTopFavs(api),
            verboseName: "numFavorites",
            description: "Favor posts that have been favorited by a lot of other users",
            defaultWeight: 1,
        });
    }
    async score(_api, status) {
        return status?.favouritesCount || 0;
    }
}
exports.default = numFavoritesScorer;
;