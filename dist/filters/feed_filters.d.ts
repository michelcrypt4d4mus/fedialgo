import { FeedFilterSettings, FilterOptionArgs } from "../types";
export declare const DEFAULT_FILTERS: FeedFilterSettings;
export declare function buildFiltersFromArgs(serializedFilterSettings: FeedFilterSettings): void;
export declare function buildNewFilterSettings(): FeedFilterSettings;
export declare function initializeFiltersWithSummaryInfo(args: FilterOptionArgs): FeedFilterSettings;
