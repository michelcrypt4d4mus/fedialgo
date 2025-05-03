"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Score toots containing hashtags the user posts about a lot
 */
const feature_scorer_1 = __importDefault(require("../feature_scorer"));
const user_data_1 = __importDefault(require("../../api/user_data"));
const types_1 = require("../../types");
const collection_helpers_1 = require("../../helpers/collection_helpers");
class HashtagParticipationScorer extends feature_scorer_1.default {
    constructor() {
        super(types_1.WeightName.HASHTAG_PARTICIPATION);
    }
    async prepareScoreData() {
        const userTags = await user_data_1.default.getPostedHashtags();
        return Object.values(userTags).reduce((acc, tag) => {
            acc[tag.name] = tag.numToots || 0;
            return acc;
        }, {});
    }
    ;
    async _score(toot) {
        return (0, collection_helpers_1.sumArray)(toot.realToot().tags.map(t => this.scoreData[t.name] || 0));
    }
}
exports.default = HashtagParticipationScorer;
;
//# sourceMappingURL=hashtag_participation_scorer.js.map