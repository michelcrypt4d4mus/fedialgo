import { type Weights } from "../types";
export declare enum WeightPresetLabel {
    CHRONOLOGICAL = "Chronological",
    DISCUSSIONS = "Discussions",
    DEFAULT = "Default",
    FRIENDS = "Friends",
    PICTURES = "Pictures",
    TOTAL_CHAOS = "Total Chaos",
    TRENDING = "Trending"
}
export type WeightPresets = Record<WeightPresetLabel, Readonly<Weights>>;
export declare const isWeightPresetLabel: (value: string) => boolean;
export declare const DEFAULT_WEIGHTS: Weights;
export declare const WEIGHT_PRESETS: WeightPresets;
