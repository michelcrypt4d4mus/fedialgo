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
 * Score toots containing hashtags the user posts about a lot.
 */
class HashtagParticipationScorer extends toot_scorer_1.default {
    description = "Favour hastags you've tooted about";
    constructor() {
        super(enums_1.ScoreName.PARTICIPATED_TAGS);
    }
    async prepareScoreData() {
        return (await tag_list_1.default.buildParticipatedTags()).nameToNumTootsDict();
    }
    ;
    // Use the square root of the number of toots with the hashtag to prevent runaway scores
    // for hashtags like #uspol
    async _score(toot) {
        return (0, collection_helpers_1.sumArray)(toot.realToot.tags.map(t => Math.sqrt(this.scoreData[t.name] || 0)));
    }
}
exports.default = HashtagParticipationScorer;
;
//# sourceMappingURL=hashtag_participation_scorer.js.map