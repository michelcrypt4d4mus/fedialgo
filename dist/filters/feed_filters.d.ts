import Toot from "../api/objects/toot";
import { type FeedFilterSettings } from "../types";
export declare const DEFAULT_FILTERS: FeedFilterSettings;
export declare function buildFiltersFromArgs(filterArgs: FeedFilterSettings): FeedFilterSettings;
export declare function buildNewFilterSettings(): FeedFilterSettings;
export declare function repairFilterSettings(filters: FeedFilterSettings): boolean;
export declare function updateBooleanFilterOptions(filters: FeedFilterSettings, toots: Toot[]): Promise<FeedFilterSettings>;
export declare function updateHashtagCounts(filters: FeedFilterSettings, toots: Toot[]): void;
