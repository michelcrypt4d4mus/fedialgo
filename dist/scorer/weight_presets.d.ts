import { Weights } from "../types";
export declare enum PresetWeightLabel {
    DEFAULT = "Default",
    FRIENDS = "Friends",
    PICTURES = "Pictures",
    TRENDING = "Trending"
}
export type WeightPresets = Record<PresetWeightLabel, Weights>;
export declare const DEFAULT_WEIGHTS: Weights;
export declare const PresetWeights: WeightPresets;
