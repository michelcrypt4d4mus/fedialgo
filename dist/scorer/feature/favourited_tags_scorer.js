"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Score how many times the current user has favourited the toot's hashtags in the past.
 */
const feature_scorer_1 = __importDefault(require("../feature_scorer"));
const tag_list_1 = __importDefault(require("../../api/tag_list"));
const types_1 = require("../../types");
const collection_helpers_1 = require("../../helpers/collection_helpers");
class FavouritedTagsScorer extends feature_scorer_1.default {
    description = "Favour toots containing hashtags you favourite";
    constructor() {
        super(types_1.ScoreName.FAVOURITED_TAGS);
    }
    ;
    async prepareScoreData() {
        return (await tag_list_1.default.fromFavourites()).numTootsLookupDict();
    }
    ;
    async _score(toot) {
        return (0, collection_helpers_1.sumArray)(toot.realToot().tags.map(tag => this.scoreData[tag.name] || 0));
    }
}
exports.default = FavouritedTagsScorer;
;
//# sourceMappingURL=favourited_tags_scorer.js.map