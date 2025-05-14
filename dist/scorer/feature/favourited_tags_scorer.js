"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Score how many times the current user has favourited the toot's hashtags in the past.
 */
const feature_scorer_1 = __importDefault(require("../feature_scorer"));
const api_1 = __importDefault(require("../../api/api"));
const tag_1 = require("../../api/objects/tag");
const types_1 = require("../../types");
const collection_helpers_1 = require("../../helpers/collection_helpers");
class FavouritedTagsScorer extends feature_scorer_1.default {
    constructor() {
        super(types_1.WeightName.FAVOURITED_TAGS);
    }
    ;
    async prepareScoreData() {
        return (0, tag_1.countTags)(await api_1.default.instance.getRecentFavourites());
    }
    ;
    async _score(toot) {
        return (0, collection_helpers_1.sumArray)(toot.realToot().tags.map(tag => this.scoreData[tag.name] || 0));
    }
}
exports.default = FavouritedTagsScorer;
;
//# sourceMappingURL=favourited_tags_scorer.js.map