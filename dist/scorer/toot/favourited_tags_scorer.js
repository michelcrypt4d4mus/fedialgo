"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const tag_list_1 = __importDefault(require("../../api/tag_list"));
const toot_scorer_1 = __importDefault(require("../toot_scorer"));
const enums_1 = require("../../enums");
const collection_helpers_1 = require("../../helpers/collection_helpers");
/**
 * Score how many times the current user has favourited the toot's hashtags in the past.
 * @memberof toot_scorers
 */
class FavouritedTagsScorer extends toot_scorer_1.default {
    description = "Favour toots containing hashtags you favourite";
    constructor() {
        super(enums_1.ScoreName.FAVOURITED_TAGS);
    }
    ;
    async prepareScoreData() {
        return (await tag_list_1.default.buildFavouritedTags()).nameToNumTootsDict();
    }
    ;
    async _score(toot) {
        return (0, collection_helpers_1.sumArray)(toot.realToot.tags.map(tag => this.scoreData[tag.name] || 0));
    }
}
exports.default = FavouritedTagsScorer;
;
//# sourceMappingURL=favourited_tags_scorer.js.map