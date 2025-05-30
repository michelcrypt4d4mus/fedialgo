import { type Weights } from "../types";
export declare enum WeightPresetLabel {
    CHRONOLOGICAL = "Chronological",
    DISCUSSIONS = "Discussions",
    DEFAULT = "Default",
    FRIENDS = "Friends",
    PICTURES = "Pictures",
    TRENDING = "Trending"
}
export type WeightPresets = Record<WeightPresetLabel, Weights>;
export declare const isWeightPresetLabel: (value: string) => boolean;
export declare const DEFAULT_WEIGHTS: Weights;
export declare const WEIGHT_PRESETS: WeightPresets;
