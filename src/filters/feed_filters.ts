/*
 * Helpers for building and serializing a complete set of FeedFilterSettings.
 */
import NumericFilter, { FILTERABLE_SCORES } from "./numeric_filter";
import PropertyFilter, { PropertyName } from "./property_filter";
import { FeedFilterSettings, FilterSections, NumericFilters, WeightName } from "../types";


export const DEFAULT_FILTERS = {
    feedFilterSectionArgs: [],
    filterSections: {} as FilterSections,
    numericFilterArgs: [],
    numericFilters: {} as NumericFilters,
} as FeedFilterSettings;


// For building a FeedFilterSettings object from the serialized version. Mutates object.
export function buildFiltersFromArgs(serializedFilterSettings: FeedFilterSettings): void {
    serializedFilterSettings.filterSections ??= {} as FilterSections;
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
    // console.debug(`Built new FeedFilterSettings:`, filters);
    return filters;
}
;
