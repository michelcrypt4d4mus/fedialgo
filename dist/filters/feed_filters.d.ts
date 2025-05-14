import Toot from "../api/objects/toot";
import UserData from "../api/user_data";
import { FeedFilterSettings } from "../types";
export declare const DEFAULT_FILTERS: FeedFilterSettings;
export declare function buildFiltersFromArgs(serializedFilterSettings: FeedFilterSettings): FeedFilterSettings;
export declare function buildNewFilterSettings(): FeedFilterSettings;
export declare function updateBooleanFilterOptions(filters: FeedFilterSettings, toots: Toot[], userData: UserData): FeedFilterSettings;
export declare function updateHashtagCounts(filters: FeedFilterSettings, toots: Toot[]): void;
