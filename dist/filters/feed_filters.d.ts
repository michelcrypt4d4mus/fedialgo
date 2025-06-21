import type Toot from "../api/objects/toot";
import { type FeedFilterSettings } from "../types";
export declare function buildNewFilterSettings(): FeedFilterSettings;
export declare function buildFiltersFromArgs(filterArgs: FeedFilterSettings): FeedFilterSettings;
export declare function repairFilterSettings(filters: FeedFilterSettings): boolean;
/**
 * Compute language, app, etc. tallies for toots in feed and use the result to initialize filter options
 * Note that this shouldn't need to be called when initializing from storage because the filter options
 * will all have been stored and reloaded along with the feed that birthed those filter options.
 * @param {FeedFilterSettings} filters - The filter settings to update with new options.
 * @param {Toot[]} toots - The toots to analyze for filter options.
 * @param {boolean} [scanForTags=false] - Whether to scan followed tags for counts.
 * @returns {Promise<void>} A promise that resolves when the filter options have been updated.
 */
export declare function updateBooleanFilterOptions(filters: FeedFilterSettings, toots: Toot[], scanForTags?: boolean): Promise<void>;
