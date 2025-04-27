import Toot from "../api/objects/toot";
import { FeedFilterSettings, UserData } from "../types";
export declare const DEFAULT_FILTERS: FeedFilterSettings;
export declare function buildFiltersFromArgs(serializedFilterSettings: FeedFilterSettings): void;
export declare function buildNewFilterSettings(): FeedFilterSettings;
export declare function initializeFiltersWithSummaryInfo(toots: Toot[], userData?: UserData): FeedFilterSettings;
