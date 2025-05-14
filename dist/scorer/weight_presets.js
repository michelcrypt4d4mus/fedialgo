"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WEIGHT_PRESETS = exports.DEFAULT_WEIGHTS = exports.isWeightPresetLabel = exports.PresetWeightLabel = void 0;
/*
 * Preset configurations to simplify user weight management.
 */
const collection_helpers_1 = require("../helpers/collection_helpers");
const types_1 = require("../types");
var PresetWeightLabel;
(function (PresetWeightLabel) {
    PresetWeightLabel["CHRONOLOGICAL"] = "Chronological";
    PresetWeightLabel["DISCUSSIONS"] = "Discussions";
    PresetWeightLabel["DEFAULT"] = "Default";
    PresetWeightLabel["FRIENDS"] = "Friends";
    PresetWeightLabel["PICTURES"] = "Pictures";
    PresetWeightLabel["TRENDING"] = "Trending";
})(PresetWeightLabel || (exports.PresetWeightLabel = PresetWeightLabel = {}));
;
const isWeightPresetLabel = (value) => (0, collection_helpers_1.isValueInStringEnum)(PresetWeightLabel)(value);
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
    [types_1.WeightName.FAVOURITED_TAGS]: 0.2,
    [types_1.WeightName.FOLLOWED_TAGS]: 4.0,
    [types_1.WeightName.IMAGE_ATTACHMENTS]: 0,
    [types_1.WeightName.INTERACTIONS]: 1.5,
    [types_1.WeightName.MENTIONS_FOLLOWED]: 2.0,
    [types_1.WeightName.MOST_REPLIED_ACCOUNTS]: 1.0,
    [types_1.WeightName.MOST_RETOOTED_ACCOUNTS]: 2,
    [types_1.WeightName.NUM_FAVOURITES]: 0.1,
    [types_1.WeightName.NUM_REPLIES]: 1.0,
    [types_1.WeightName.NUM_RETOOTS]: 1.0,
    [types_1.WeightName.PARTICIPATED_TAGS]: 0.3,
    [types_1.WeightName.RETOOTED_IN_FEED]: 2.0,
    [types_1.WeightName.TRENDING_LINKS]: 0.7,
    [types_1.WeightName.TRENDING_TAGS]: 0.5,
    [types_1.WeightName.TRENDING_TOOTS]: 1.0,
    [types_1.WeightName.VIDEO_ATTACHMENTS]: 0,
};
exports.WEIGHT_PRESETS = {
    [PresetWeightLabel.CHRONOLOGICAL]: {
        [types_1.WeightName.TIME_DECAY]: 10.0,
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
    [PresetWeightLabel.DEFAULT]: exports.DEFAULT_WEIGHTS,
    [PresetWeightLabel.DISCUSSIONS]: {
        ...exports.DEFAULT_WEIGHTS,
        [types_1.WeightName.TRENDING]: 0.01,
        [types_1.WeightName.CHAOS]: 0,
        [types_1.WeightName.DIVERSITY]: 0,
        [types_1.WeightName.NUM_REPLIES]: 50.0,
    },
    [PresetWeightLabel.FRIENDS]: {
        ...exports.DEFAULT_WEIGHTS,
        [types_1.WeightName.TRENDING]: 0.02,
        [types_1.WeightName.INTERACTIONS]: 2.5,
        [types_1.WeightName.MENTIONS_FOLLOWED]: 3.0,
        [types_1.WeightName.MOST_REPLIED_ACCOUNTS]: 3.0,
        [types_1.WeightName.MOST_RETOOTED_ACCOUNTS]: 3.0,
    },
    [PresetWeightLabel.PICTURES]: {
        ...exports.DEFAULT_WEIGHTS,
        [types_1.WeightName.IMAGE_ATTACHMENTS]: 5.0,
        [types_1.WeightName.VIDEO_ATTACHMENTS]: 5.0,
    },
    [PresetWeightLabel.TRENDING]: {
        ...exports.DEFAULT_WEIGHTS,
        [types_1.WeightName.TRENDING]: 0.5,
        [types_1.WeightName.TRENDING_LINKS]: exports.DEFAULT_WEIGHTS[types_1.WeightName.TRENDING_LINKS] * 3,
        [types_1.WeightName.TRENDING_TAGS]: exports.DEFAULT_WEIGHTS[types_1.WeightName.TRENDING_TAGS] * 3,
        [types_1.WeightName.TRENDING_TOOTS]: exports.DEFAULT_WEIGHTS[types_1.WeightName.TRENDING_TOOTS] * 3,
    },
};
//# sourceMappingURL=weight_presets.js.map