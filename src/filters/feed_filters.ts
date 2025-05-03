/*
 * Helpers for building and serializing a complete set of FeedFilterSettings.
 */
import NumericFilter, { FILTERABLE_SCORES } from "./numeric_filter";
import PropertyFilter, { PropertyName } from "./property_filter";
import Storage from "../Storage";
import Toot from "../api/objects/toot";
import UserData from "../api/user_data";
import { incrementCount } from "../helpers/collection_helpers";
import { traceLog } from "../helpers/log_helpers";
import { TYPE_FILTERS } from "./property_filter";
import {
    FeedFilterSettings,
    PropertyFilters,
    NumericFilters,
    StringNumberDict,
    WeightName,
} from "../types";


export const DEFAULT_FILTERS = {
    feedFilterSectionArgs: [],
    filterSections: {} as PropertyFilters,
    numericFilterArgs: [],
    numericFilters: {} as NumericFilters,
} as FeedFilterSettings;


// For building a FeedFilterSettings object from the serialized version.
// NOTE: Mutates object.
export function buildFiltersFromArgs(serializedFilterSettings: FeedFilterSettings): void {
    serializedFilterSettings.filterSections ??= {} as PropertyFilters;
    serializedFilterSettings.numericFilters ??= {} as NumericFilters;

    serializedFilterSettings.feedFilterSectionArgs.forEach((args) => {
        serializedFilterSettings.filterSections[args.title as PropertyName] = new PropertyFilter(args);
    });

    serializedFilterSettings.numericFilterArgs.forEach((args) => {
        serializedFilterSettings.numericFilters[args.title as WeightName] = new NumericFilter(args);
    });

    // Fill in any missing values
    FILTERABLE_SCORES.forEach(weightName => {
        serializedFilterSettings.numericFilters[weightName] ??= new NumericFilter({title: weightName});
    });
};


// Build a new FeedFilterSettings object with DEFAULT_FILTERS as the base.
// Start with numeric & type filters. Other PropertyFilters depend on what's in the toots.
export function buildNewFilterSettings(): FeedFilterSettings {
    // Stringify and parse to get a deep copy of the default filters
    const filters = JSON.parse(JSON.stringify(DEFAULT_FILTERS)) as FeedFilterSettings;
    filters.filterSections[PropertyName.TYPE] = new PropertyFilter({title: PropertyName.TYPE});
    FILTERABLE_SCORES.forEach(f => filters.numericFilters[f] = new NumericFilter({title: f}));
    return filters;
};


// Compute language, app, etc. tallies for toots in feed and use the result to initialize filter options
// Note that this shouldn't need to be called when initializing from storage because the filter options
// will all have been stored and reloaded along with the feed that birthed those filter options.
export function initializeFiltersWithSummaryInfo(toots: Toot[], userData: UserData): FeedFilterSettings {
    const filters: FeedFilterSettings = buildNewFilterSettings();

    const tootCounts = Object.values(PropertyName).reduce(
        (counts, propertyName) => {
            // Instantiate missing filter sections  // TODO: maybe this should happen in Storage?
            filters.filterSections[propertyName] ??= new PropertyFilter({title: propertyName});
            counts[propertyName as PropertyName] = {} as StringNumberDict;
            return counts;
        },
        {} as Record<PropertyName, StringNumberDict>
    );

    toots.forEach(toot => {
        incrementCount(tootCounts[PropertyName.APP], toot.realToot().application.name);
        incrementCount(tootCounts[PropertyName.LANGUAGE], toot.realToot().language);
        incrementCount(tootCounts[PropertyName.USER], toot.realToot().account.webfingerURI);

        // Count tags
        toot.realToot().tags.forEach((tag) => incrementCount(tootCounts[PropertyName.HASHTAG], tag.name));

        // Aggregate counts for each type of toot
        Object.entries(TYPE_FILTERS).forEach(([name, typeFilter]) => {
            if (typeFilter(toot)) {
                incrementCount(tootCounts[PropertyName.TYPE], name);
            }
        });

        // Aggregate server-side filter counts (toots matching server side filters are hidden by default)
        userData.serverSideFilters.forEach((filter) => {
            filter.keywords.forEach((keyword) => {
                if (toot.realToot().containsString(keyword.keyword)) {
                    traceLog(`Matched server filter (${toot.describe()}):`, filter);
                    incrementCount(tootCounts[PropertyName.SERVER_SIDE_FILTERS], keyword.keyword);
                }
            });
        });
    });

    // TODO: if there's a validValues element for a filter section that is no longer in the feed
    //       the user will not be presented with the option to turn it off. This is a bug.
    Object.entries(tootCounts).forEach(([propertyName, counts]) => {
        filters.filterSections[propertyName as PropertyName].setOptions(counts);
    });

    Storage.setFilters(filters);
    console.debug(`[initializeFiltersWithSummaryInfo()] completed, built filters:`, filters);
    return filters;
}
