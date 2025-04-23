/*
 * Preset configurations to simplify user weight management.
 */

import { WeightName, Weights } from "../types";


export enum PresetWeightLabel {
    CHRONOLOGICAL = 'Chronological',
    DEFAULT = 'Default',
    FRIENDS = 'Friends',
    PICTURES = 'Pictures',
    TRENDING = 'Trending',
};

export type WeightPresets = Record<PresetWeightLabel, Weights>;

export const DEFAULT_WEIGHTS: Weights = {
    // Global modifiers that affect all weighted scores
    [WeightName.TIME_DECAY]: 0.05,
    [WeightName.TRENDING]: 0.06,
    // Weighted scores
    [WeightName.CHAOS]: 1.0,
    [WeightName.DIVERSITY]: 1.0,
    [WeightName.FAVORITED_ACCOUNTS]: 1.0,
    [WeightName.FOLLOWED_TAGS]: 2.0,
    [WeightName.IMAGE_ATTACHMENTS]: 0,
    [WeightName.INTERACTIONS]: 1.5,
    [WeightName.MENTIONS_FOLLOWED]: 2.0,
    [WeightName.MOST_REPLIED_ACCOUNTS]: 1.0,
    [WeightName.MOST_RETOOTED_ACCOUNTS]: 2,
    [WeightName.NUM_FAVOURITES]: 1.0,
    [WeightName.NUM_REPLIES]: 1.0,
    [WeightName.NUM_RETOOTS]: 1.0,
    [WeightName.RETOOTED_IN_FEED]: 2.0,
    [WeightName.TRENDING_LINKS]: 0.7,
    [WeightName.TRENDING_TAGS]: 0.5,
    [WeightName.TRENDING_TOOTS]: 1.0,
    [WeightName.VIDEO_ATTACHMENTS]: 0,
};

export const PresetWeights: WeightPresets = {
    [PresetWeightLabel.CHRONOLOGICAL]: {
        [WeightName.TIME_DECAY]: 1.0,
        [WeightName.TRENDING]: 0,
        [WeightName.CHAOS]: 0,
        [WeightName.DIVERSITY]: 0,
        [WeightName.FAVORITED_ACCOUNTS]: 0,
        [WeightName.FOLLOWED_TAGS]: 0,
        [WeightName.IMAGE_ATTACHMENTS]: 0,
        [WeightName.INTERACTIONS]: 0,
        [WeightName.MENTIONS_FOLLOWED]: 0,
        [WeightName.MOST_REPLIED_ACCOUNTS]: 0,
        [WeightName.MOST_RETOOTED_ACCOUNTS]: 0,
        [WeightName.NUM_FAVOURITES]: 0,
        [WeightName.NUM_REPLIES]: 0,
        [WeightName.NUM_RETOOTS]: 0,
        [WeightName.RETOOTED_IN_FEED]: 0,
        [WeightName.TRENDING_LINKS]: 7,
        [WeightName.TRENDING_TAGS]: 5,
        [WeightName.TRENDING_TOOTS]: 0,
        [WeightName.VIDEO_ATTACHMENTS]: 0,
    },

    [PresetWeightLabel.DEFAULT]: DEFAULT_WEIGHTS,

    [PresetWeightLabel.FRIENDS]: {
        ...DEFAULT_WEIGHTS,
        [WeightName.TRENDING]: 0.02,
        [WeightName.INTERACTIONS]: 2.5,
        [WeightName.MENTIONS_FOLLOWED]: 3.0,
        [WeightName.MOST_REPLIED_ACCOUNTS]: 3.0,
        [WeightName.MOST_RETOOTED_ACCOUNTS]: 3.0,
    },

    [PresetWeightLabel.PICTURES]: {
        ...DEFAULT_WEIGHTS,
        [WeightName.IMAGE_ATTACHMENTS]: 5.0,
        [WeightName.VIDEO_ATTACHMENTS]: 5.0,
    },

    [PresetWeightLabel.TRENDING]: {
        ...DEFAULT_WEIGHTS,
        [WeightName.TRENDING]: DEFAULT_WEIGHTS[WeightName.TRENDING] * 3,
    },
};
