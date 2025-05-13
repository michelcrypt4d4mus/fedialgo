/*
 * Helpers for building and serializing a complete set of FeedFilterSettings.
 */
import NumericFilter, { FILTERABLE_SCORES } from "./numeric_filter";
import PropertyFilter, { PropertyName } from "./property_filter";
import Storage from "../Storage";
import Toot from "../api/objects/toot";
import UserData from "../api/user_data";
import { ageString } from "../helpers/time_helpers";
import { Config } from "../config";
import { detectHashtagLanguage } from "../helpers/language_helper";
import { incrementCount, sumArray, sumValues } from "../helpers/collection_helpers";
import { traceLog } from "../helpers/log_helpers";
import { TYPE_FILTERS } from "./property_filter";
import {
    FeedFilterSettings,
    NumericFilters,
    PropertyFilters,
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
export function buildFiltersFromArgs(serializedFilterSettings: FeedFilterSettings): FeedFilterSettings {
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

    return serializedFilterSettings;
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
export function updatePropertyFilterOptions(
    filters: FeedFilterSettings,
    toots: Toot[],
    userData: UserData
): FeedFilterSettings {
    const logPrefx = `[updatePropertyFilterOptions()]`
    const suppressedNonLatinTags: Record<string, StringNumberDict> = {};

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
        // TODO: this only counts actual tags whereas the demo app filters based on containsString() so
        // the counts don't match. To fix this we'd have to go back over the toots and check for each tag
        toot.realToot().tags.forEach((tag) => {
            const language = detectHashtagLanguage(tag.name);

            if (language && language != Config.language) {
                suppressedNonLatinTags[language] ??= {};
                incrementCount(suppressedNonLatinTags[language], tag.name);
                return;
            };

            incrementCount(tootCounts[PropertyName.HASHTAG], tag.name);
        });

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

    if (Object.keys(suppressedNonLatinTags).length) {
        const languageCounts = Object.values(suppressedNonLatinTags).map(counts => sumValues(counts));
        console.debug(`${logPrefx} Suppressed ${sumArray(languageCounts)} non-Latin hashtags:`, suppressedNonLatinTags);
    }

    Storage.setFilters(filters);  // NOTE: there's no "await" here...
    console.debug(`${logPrefx} completed, built filters:`, filters);
    return filters;
};


// We have to rescan the toots to get the tag counts because the tag counts are built with
// containsTag() whereas the demo app uses containsString() to actually filter.
// TODO: this takes 4 minutes for 3000 toots. Maybe could just do it for tags with more than some min number of toots?
export function updateHashtagCounts(filters: FeedFilterSettings, toots: Toot[],): void {
    const logPrefx = `[updateHashtagCounts()]`;
    const newTootTagCounts = {} as StringNumberDict;
    console.log(`${logPrefx} Launched...`);
    const startedAt = Date.now();

    Object.keys(filters.filterSections[PropertyName.HASHTAG].optionInfo).forEach((tagName) => {
        toots.forEach((toot) => {
            if (toot.realToot().containsTag(tagName, true)) {
                incrementCount(newTootTagCounts, tagName);
            }
        })
    });

    console.log(`${logPrefx} Recomputed tag counts ${ageString(startedAt)}`);
    filters.filterSections[PropertyName.HASHTAG].setOptions(newTootTagCounts);
    Storage.setFilters(filters);
}
