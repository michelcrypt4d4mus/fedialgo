/*
 * Preset configurations to simplify user weight management.
 */
import { isValueInStringEnum } from "../helpers/collection_helpers";
import { WeightName, Weights } from "../types";

export enum WeightPresetLabel {
    CHRONOLOGICAL = 'Chronological',
    DISCUSSIONS = 'Discussions',
    DEFAULT = 'Default',
    FRIENDS = 'Friends',
    PICTURES = 'Pictures',
    TRENDING = 'Trending',
};

export type WeightPresets = Record<WeightPresetLabel, Weights>;
export const isWeightPresetLabel = (value: string) => isValueInStringEnum(WeightPresetLabel)(value);


export const DEFAULT_WEIGHTS: Weights = {
    // Global modifiers that affect all weighted scores
    [WeightName.TIME_DECAY]: 1.5,
    [WeightName.TRENDING]: 0.15,
    [WeightName.OUTLIER_DAMPENER]: 1.6,
    // Weighted scores
    [WeightName.CHAOS]: 1.0,
    [WeightName.DIVERSITY]: 1.0,
    [WeightName.FAVOURITED_ACCOUNTS]: 1.0,
    [WeightName.FAVOURITED_TAGS]: 0.1,
    [WeightName.FOLLOWED_TAGS]: 4.0,
    [WeightName.IMAGE_ATTACHMENTS]: 0,
    [WeightName.INTERACTIONS]: 1.0,
    [WeightName.MENTIONS_FOLLOWED]: 2.0,
    [WeightName.MOST_REPLIED_ACCOUNTS]: 1.0,
    [WeightName.MOST_RETOOTED_ACCOUNTS]: 1.5,
    [WeightName.NUM_FAVOURITES]: 0.1,  // Favourites only show up on the home server so underweight this
    [WeightName.NUM_REPLIES]: 1.0,
    [WeightName.NUM_RETOOTS]: 1.0,
    [WeightName.PARTICIPATED_TAGS]: 0.3,
    [WeightName.RETOOTED_IN_FEED]: 2.0,
    [WeightName.TRENDING_LINKS]: 0.7,
    [WeightName.TRENDING_TAGS]: 0.2,
    [WeightName.TRENDING_TOOTS]: 1.0,
    [WeightName.VIDEO_ATTACHMENTS]: 0,
};


export const WEIGHT_PRESETS: WeightPresets = {
    [WeightPresetLabel.CHRONOLOGICAL]: {
        [WeightName.TIME_DECAY]: 9.99,
        [WeightName.TRENDING]: 0,
        [WeightName.OUTLIER_DAMPENER]: 0,
        [WeightName.CHAOS]: 0,
        [WeightName.DIVERSITY]: 0,
        [WeightName.FAVOURITED_ACCOUNTS]: 0,
        [WeightName.FAVOURITED_TAGS]: 0,
        [WeightName.FOLLOWED_TAGS]: 0,
        [WeightName.IMAGE_ATTACHMENTS]: 0,
        [WeightName.INTERACTIONS]: 0,
        [WeightName.MENTIONS_FOLLOWED]: 0,
        [WeightName.MOST_REPLIED_ACCOUNTS]: 0,
        [WeightName.MOST_RETOOTED_ACCOUNTS]: 0,
        [WeightName.NUM_FAVOURITES]: 0,
        [WeightName.NUM_REPLIES]: 0,
        [WeightName.NUM_RETOOTS]: 0,
        [WeightName.PARTICIPATED_TAGS]: 0,
        [WeightName.RETOOTED_IN_FEED]: 0,
        [WeightName.TRENDING_LINKS]: 0,
        [WeightName.TRENDING_TAGS]: 0,
        [WeightName.TRENDING_TOOTS]: 0,
        [WeightName.VIDEO_ATTACHMENTS]: 0,
    },

    [WeightPresetLabel.DEFAULT]: DEFAULT_WEIGHTS,

    [WeightPresetLabel.DISCUSSIONS]: {
        ...DEFAULT_WEIGHTS,
        [WeightName.TRENDING]: 0.01,
        [WeightName.CHAOS]: 0,
        [WeightName.DIVERSITY]: 0,
        [WeightName.NUM_REPLIES]: 50.0,
    },

    [WeightPresetLabel.FRIENDS]: {
        ...DEFAULT_WEIGHTS,
        [WeightName.TRENDING]: 0.02,
        [WeightName.INTERACTIONS]: 2.5,
        [WeightName.MENTIONS_FOLLOWED]: 3.0,
        [WeightName.MOST_REPLIED_ACCOUNTS]: 3.0,
        [WeightName.MOST_RETOOTED_ACCOUNTS]: 3.0,
    },

    [WeightPresetLabel.PICTURES]: {
        ...DEFAULT_WEIGHTS,
        [WeightName.IMAGE_ATTACHMENTS]: 5.0,
        [WeightName.VIDEO_ATTACHMENTS]: 5.0,
    },

    [WeightPresetLabel.TRENDING]: {
        ...DEFAULT_WEIGHTS,
        [WeightName.TRENDING]: 0.5,
        [WeightName.TRENDING_LINKS]: DEFAULT_WEIGHTS[WeightName.TRENDING_LINKS] * 3,
        [WeightName.TRENDING_TAGS]: DEFAULT_WEIGHTS[WeightName.TRENDING_TAGS] * 3,
        [WeightName.TRENDING_TOOTS]: DEFAULT_WEIGHTS[WeightName.TRENDING_TOOTS] * 3,
    },
};
