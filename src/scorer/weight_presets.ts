/*
 * Preset configurations to simplify user weight management.
 */
import { isValueInStringEnum } from "../helpers/collection_helpers";
import { NonScoreWeightName, ScoreName } from '../enums';
import { type Weights, type WeightName } from "../types";

export enum WeightPresetLabel {
    CHRONOLOGICAL = 'Chronological',
    DISCUSSIONS = 'Discussions',
    DEFAULT = 'Default',
    FRIENDS = 'Friends',
    PICTURES = 'Pictures',
    TOTAL_CHAOS = 'Total Chaos',
    TRENDING = 'Trending',
};

export type WeightPresets = Record<WeightPresetLabel, Weights>;
export const isWeightPresetLabel = (value: string) => isValueInStringEnum(WeightPresetLabel)(value);


export const DEFAULT_WEIGHTS: Weights = {
    // Global modifiers that affect all weighted scores
    [NonScoreWeightName.TIME_DECAY]: 1.5,
    [NonScoreWeightName.TRENDING]: 0.15,
    [NonScoreWeightName.OUTLIER_DAMPENER]: 1.6,
    // Weighted scores
    [ScoreName.ALREADY_SHOWN]: -5,
    [ScoreName.AUTHOR_FOLLOWERS]: -0.1,
    [ScoreName.CHAOS]: 1.0,
    [ScoreName.DIVERSITY]: -2.0,
    [ScoreName.FAVOURITED_ACCOUNTS]: 1.0,
    [ScoreName.FAVOURITED_TAGS]: 0.1,
    [ScoreName.FOLLOWED_ACCOUNTS]: 1.5,
    [ScoreName.FOLLOWED_TAGS]: 4.0,
    [ScoreName.IMAGE_ATTACHMENTS]: 0,
    [ScoreName.INTERACTIONS]: 1.0,
    [ScoreName.MENTIONS_FOLLOWED]: 2.0,
    [ScoreName.MOST_REPLIED_ACCOUNTS]: 1.0,
    [ScoreName.MOST_RETOOTED_ACCOUNTS]: 1.5,
    [ScoreName.NUM_FAVOURITES]: 0.1,  // Favourites only show up on the home server so underweight this
    [ScoreName.NUM_REPLIES]: 1.0,
    [ScoreName.NUM_RETOOTS]: 1.0,
    [ScoreName.PARTICIPATED_TAGS]: 0.15,
    [ScoreName.RETOOTED_IN_FEED]: 2.0,
    [ScoreName.TRENDING_LINKS]: 0.7,
    [ScoreName.TRENDING_TAGS]: 0.2,
    [ScoreName.TRENDING_TOOTS]: 1.0,
    [ScoreName.VIDEO_ATTACHMENTS]: 0,
};


export const WEIGHT_PRESETS: WeightPresets = {
    [WeightPresetLabel.CHRONOLOGICAL]: Object.values(ScoreName).reduce(
        (preset, score) => {
            preset[score] = 0;
            return preset;
        },
        {
            [NonScoreWeightName.TIME_DECAY]: 9.99,
            [NonScoreWeightName.TRENDING]: 0,
            [NonScoreWeightName.OUTLIER_DAMPENER]: 0,
        } as Weights
    ),

    [WeightPresetLabel.DEFAULT]: {
        ...DEFAULT_WEIGHTS
    },

    [WeightPresetLabel.DISCUSSIONS]: {
        ...DEFAULT_WEIGHTS,
        [NonScoreWeightName.TRENDING]: 0.001,
        [ScoreName.CHAOS]: 0,
        [ScoreName.DIVERSITY]: 0,
        [ScoreName.FOLLOWED_ACCOUNTS]: 0.3,
        [ScoreName.INTERACTIONS]: 1.0,
        [ScoreName.MENTIONS_FOLLOWED]: 5.0,
        [ScoreName.MOST_REPLIED_ACCOUNTS]: 0.15,
        [ScoreName.MOST_RETOOTED_ACCOUNTS]: 0.2,
        [ScoreName.NUM_REPLIES]: 50.0,
        [ScoreName.NUM_RETOOTS]: 0.2,
        [ScoreName.PARTICIPATED_TAGS]: DEFAULT_WEIGHTS[ScoreName.PARTICIPATED_TAGS] * 2,
        [ScoreName.RETOOTED_IN_FEED]: 6.0,
    },

    [WeightPresetLabel.FRIENDS]: {
        ...DEFAULT_WEIGHTS,
        [NonScoreWeightName.TRENDING]: 0.02,
        [ScoreName.INTERACTIONS]: 4,
        [ScoreName.MENTIONS_FOLLOWED]: 3,
        [ScoreName.NUM_REPLIES]: DEFAULT_WEIGHTS[ScoreName.NUM_REPLIES] * 0.3,
        [ScoreName.NUM_RETOOTS]: DEFAULT_WEIGHTS[ScoreName.NUM_RETOOTS] * 0.3,
        [ScoreName.MOST_REPLIED_ACCOUNTS]: 3,
        [ScoreName.MOST_RETOOTED_ACCOUNTS]: 3,
    },

    [WeightPresetLabel.PICTURES]: {
        ...DEFAULT_WEIGHTS,
        [ScoreName.IMAGE_ATTACHMENTS]: 5.0,
        [ScoreName.VIDEO_ATTACHMENTS]: 5.0,
    },

    [WeightPresetLabel.TOTAL_CHAOS]: Object.values(ScoreName).reduce(
        (preset, scoreName) => {
            preset[scoreName] = scoreName == ScoreName.CHAOS ? 100 : 0;
            return preset;
        },
        {
            [NonScoreWeightName.TIME_DECAY]: 9.99,
            [NonScoreWeightName.TRENDING]: 0,
            [NonScoreWeightName.OUTLIER_DAMPENER]: 0,
        } as Weights
    ),

    [WeightPresetLabel.TRENDING]: {
        ...DEFAULT_WEIGHTS,
        [NonScoreWeightName.TRENDING]: 0.5,
        [ScoreName.CHAOS]: 5,
        [ScoreName.FOLLOWED_TAGS]: 0.1,
        [ScoreName.NUM_REPLIES]: DEFAULT_WEIGHTS[ScoreName.NUM_REPLIES] * 3,
        [ScoreName.NUM_RETOOTS]: DEFAULT_WEIGHTS[ScoreName.NUM_RETOOTS] * 3,
        [ScoreName.TRENDING_LINKS]: DEFAULT_WEIGHTS[ScoreName.TRENDING_LINKS] * 3,
        [ScoreName.TRENDING_TAGS]: DEFAULT_WEIGHTS[ScoreName.TRENDING_TAGS] * 3,
        [ScoreName.TRENDING_TOOTS]: DEFAULT_WEIGHTS[ScoreName.TRENDING_TOOTS] * 3,
    },
};
