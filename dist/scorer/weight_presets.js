"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WEIGHT_PRESETS = exports.DEFAULT_WEIGHTS = exports.isWeightPresetLabel = exports.WeightPresetLabel = void 0;
/*
 * Preset configurations to simplify user weight management.
 */
const collection_helpers_1 = require("../helpers/collection_helpers");
const types_1 = require("../types");
var WeightPresetLabel;
(function (WeightPresetLabel) {
    WeightPresetLabel["CHRONOLOGICAL"] = "Chronological";
    WeightPresetLabel["DISCUSSIONS"] = "Discussions";
    WeightPresetLabel["DEFAULT"] = "Default";
    WeightPresetLabel["FRIENDS"] = "Friends";
    WeightPresetLabel["PICTURES"] = "Pictures";
    WeightPresetLabel["TRENDING"] = "Trending";
})(WeightPresetLabel || (exports.WeightPresetLabel = WeightPresetLabel = {}));
;
const isWeightPresetLabel = (value) => (0, collection_helpers_1.isValueInStringEnum)(WeightPresetLabel)(value);
exports.isWeightPresetLabel = isWeightPresetLabel;
exports.DEFAULT_WEIGHTS = {
    // Global modifiers that affect all weighted scores
    [types_1.WeightName.TIME_DECAY]: 1.5,
    [types_1.WeightName.TRENDING]: 0.15,
    [types_1.WeightName.OUTLIER_DAMPENER]: 1.6,
    // Weighted scores
    [types_1.WeightName.CHAOS]: 1.0,
    [types_1.WeightName.DIVERSITY]: 1.0,
    [types_1.WeightName.FAVOURITED_ACCOUNTS]: 1.0,
    [types_1.WeightName.FAVOURITED_TAGS]: 0.1,
    [types_1.WeightName.FOLLOWED_TAGS]: 4.0,
    [types_1.WeightName.IMAGE_ATTACHMENTS]: 0,
    [types_1.WeightName.INTERACTIONS]: 1.0,
    [types_1.WeightName.MENTIONS_FOLLOWED]: 2.0,
    [types_1.WeightName.MOST_REPLIED_ACCOUNTS]: 1.0,
    [types_1.WeightName.MOST_RETOOTED_ACCOUNTS]: 1.5,
    [types_1.WeightName.NUM_FAVOURITES]: 0.1,
    [types_1.WeightName.NUM_REPLIES]: 1.0,
    [types_1.WeightName.NUM_RETOOTS]: 1.0,
    [types_1.WeightName.PARTICIPATED_TAGS]: 0.3,
    [types_1.WeightName.RETOOTED_IN_FEED]: 2.0,
    [types_1.WeightName.TRENDING_LINKS]: 0.7,
    [types_1.WeightName.TRENDING_TAGS]: 0.2,
    [types_1.WeightName.TRENDING_TOOTS]: 1.0,
    [types_1.WeightName.VIDEO_ATTACHMENTS]: 0,
};
exports.WEIGHT_PRESETS = {
    [WeightPresetLabel.CHRONOLOGICAL]: {
        [types_1.WeightName.TIME_DECAY]: 9.99,
        [types_1.WeightName.TRENDING]: 0,
        [types_1.WeightName.OUTLIER_DAMPENER]: 0,
        [types_1.WeightName.CHAOS]: 0,
        [types_1.WeightName.DIVERSITY]: 0,
        [types_1.WeightName.FAVOURITED_ACCOUNTS]: 0,
        [types_1.WeightName.FAVOURITED_TAGS]: 0,
        [types_1.WeightName.FOLLOWED_TAGS]: 0,
        [types_1.WeightName.IMAGE_ATTACHMENTS]: 0,
        [types_1.WeightName.INTERACTIONS]: 0,
        [types_1.WeightName.MENTIONS_FOLLOWED]: 0,
        [types_1.WeightName.MOST_REPLIED_ACCOUNTS]: 0,
        [types_1.WeightName.MOST_RETOOTED_ACCOUNTS]: 0,
        [types_1.WeightName.NUM_FAVOURITES]: 0,
        [types_1.WeightName.NUM_REPLIES]: 0,
        [types_1.WeightName.NUM_RETOOTS]: 0,
        [types_1.WeightName.PARTICIPATED_TAGS]: 0,
        [types_1.WeightName.RETOOTED_IN_FEED]: 0,
        [types_1.WeightName.TRENDING_LINKS]: 0,
        [types_1.WeightName.TRENDING_TAGS]: 0,
        [types_1.WeightName.TRENDING_TOOTS]: 0,
        [types_1.WeightName.VIDEO_ATTACHMENTS]: 0,
    },
    [WeightPresetLabel.DEFAULT]: exports.DEFAULT_WEIGHTS,
    [WeightPresetLabel.DISCUSSIONS]: {
        ...exports.DEFAULT_WEIGHTS,
        [types_1.WeightName.TRENDING]: 0.001,
        [types_1.WeightName.CHAOS]: 0,
        [types_1.WeightName.DIVERSITY]: 0,
        [types_1.WeightName.INTERACTIONS]: 2.5,
        [types_1.WeightName.NUM_REPLIES]: 50.0,
        [types_1.WeightName.PARTICIPATED_TAGS]: exports.DEFAULT_WEIGHTS[types_1.WeightName.PARTICIPATED_TAGS] * 2,
    },
    [WeightPresetLabel.FRIENDS]: {
        ...exports.DEFAULT_WEIGHTS,
        [types_1.WeightName.TRENDING]: 0.02,
        [types_1.WeightName.INTERACTIONS]: 4,
        [types_1.WeightName.MENTIONS_FOLLOWED]: 3,
        [types_1.WeightName.MOST_REPLIED_ACCOUNTS]: 3,
        [types_1.WeightName.MOST_RETOOTED_ACCOUNTS]: 3,
    },
    [WeightPresetLabel.PICTURES]: {
        ...exports.DEFAULT_WEIGHTS,
        [types_1.WeightName.IMAGE_ATTACHMENTS]: 5.0,
        [types_1.WeightName.VIDEO_ATTACHMENTS]: 5.0,
    },
    [WeightPresetLabel.TRENDING]: {
        ...exports.DEFAULT_WEIGHTS,
        [types_1.WeightName.TRENDING]: 0.5,
        [types_1.WeightName.CHAOS]: 5,
        [types_1.WeightName.FOLLOWED_TAGS]: 0.1,
        [types_1.WeightName.NUM_REPLIES]: exports.DEFAULT_WEIGHTS[types_1.WeightName.NUM_REPLIES] * 3,
        [types_1.WeightName.NUM_RETOOTS]: exports.DEFAULT_WEIGHTS[types_1.WeightName.NUM_RETOOTS] * 3,
        [types_1.WeightName.TRENDING_LINKS]: exports.DEFAULT_WEIGHTS[types_1.WeightName.TRENDING_LINKS] * 3,
        [types_1.WeightName.TRENDING_TAGS]: exports.DEFAULT_WEIGHTS[types_1.WeightName.TRENDING_TAGS] * 3,
        [types_1.WeightName.TRENDING_TOOTS]: exports.DEFAULT_WEIGHTS[types_1.WeightName.TRENDING_TOOTS] * 3,
    },
};
//# sourceMappingURL=weight_presets.js.map