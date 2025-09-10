import type Toot from "../api/objects/toot";
import { type FeedFilterSettings } from "../types";
/**
 * Build a new {@linkcode FeedFilterSettings} object with {@linkcode DEFAULT_FILTERS} as the base.
 * Start with numeric & type filters. Other {@linkcode BooleanFilter}s depend on what's in the toots.
 * @returns {FeedFilterSettings}
 */
export declare function buildNewFilterSettings(): FeedFilterSettings;
/**
 * Build a {@linkcode FeedFilterSettings} object from the serialized version.
 * NOTE: Mutates object.
 * @param {FeedFilterSettings} filterArgs - The serialized filter settings.
 * @returns {FeedFilterSettings} The reconstructed filter settings with instantiated filter objects.
 */
export declare function buildFiltersFromArgs(filterArgs: FeedFilterSettings): FeedFilterSettings;
/**
 * Remove filter args with invalid {@linkcode propertyName}s. Used to upgrade
 * existing users who may have obsolete args in browser Storage.
 * @param {FeedFilterSettings} filters - The filter settings to check and repair.
 * @returns {boolean} True if any repairs were made, false otherwise.
 */
export declare function repairFilterSettings(filters: FeedFilterSettings): boolean;
/**
 * Compute language, app, etc. tallies for toots in feed and use the result to initialize filter options.
 * Note that this shouldn't need to be called when initializing from storage because the filter options
 * will all have been stored and reloaded along with the feed that birthed those filter options.
 * @param {FeedFilterSettings} filters - The filter settings to update with new options.
 * @param {Toot[]} toots - The toots to analyze for filter options.
 * @param {boolean} [scanForTags=false] - Whether to scan followed tags for counts.
 * @returns {Promise<void>} A promise that resolves when the filter options have been updated.
 */
export declare function updateBooleanFilterOptions(filters: FeedFilterSettings, toots: Toot[], scanForTags?: boolean): Promise<void>;
