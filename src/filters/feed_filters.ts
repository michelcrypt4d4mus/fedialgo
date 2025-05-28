/*
 * Helpers for building and serializing a complete set of FeedFilterSettings.
 */
import BooleanFilter, { TYPE_FILTERS, BooleanFilterArgs, BooleanFilterName, isBooleanFilterName } from "./boolean_filter";
import NumericFilter, { FILTERABLE_SCORES, isNumericFilterName } from "./numeric_filter";
import Storage from "../Storage";
import Toot from "../api/objects/toot";
import { ageString } from "../helpers/time_helpers";
import { config } from "../config";
import { incrementCount, split, sumArray, sumValues } from "../helpers/collection_helpers";
import { traceLog } from "../helpers/log_helpers";
import {
    BooleanFilters,
    FeedFilterSettings,
    FilterArgs,
    NumericFilters,
    StringNumberDict,
    TootNumberProp,
} from "../types";

export const DEFAULT_FILTERS = {
    booleanFilterArgs: [],
    booleanFilters: {} as BooleanFilters,
    numericFilterArgs: [],
    numericFilters: {} as NumericFilters,
} as FeedFilterSettings;


// For building a FeedFilterSettings object from the serialized version.
// NOTE: Mutates object.
export function buildFiltersFromArgs(filterArgs: FeedFilterSettings): FeedFilterSettings {
    filterArgs.booleanFilters = filterArgs.booleanFilterArgs.reduce((filters, args) => {
        filters[args.title as BooleanFilterName] = new BooleanFilter(args);
        return filters
    }, {} as BooleanFilters);

    filterArgs.numericFilters = filterArgs.numericFilterArgs.reduce((filters, args) => {
        filters[args.title as TootNumberProp] = new NumericFilter(args);
        return filters
    }, {} as NumericFilters);

    populateMissingNumericFilters(filterArgs);
    return filterArgs;
};


// Build a new FeedFilterSettings object with DEFAULT_FILTERS as the base.
// Start with numeric & type filters. Other BooleanFilters depend on what's in the toots.
export function buildNewFilterSettings(): FeedFilterSettings {
    // Stringify and parse to get a deep copy of the default filters
    const filters = JSON.parse(JSON.stringify(DEFAULT_FILTERS)) as FeedFilterSettings;
    filters.booleanFilters[BooleanFilterName.TYPE] = new BooleanFilter({title: BooleanFilterName.TYPE});
    populateMissingNumericFilters(filters);
    return filters;
};


// Remove filter args with invalid titles to upgrade existing users w/invalid args in browser Storage.
// Returns true if the filter settings were changed.
export function repairFilterSettings(filters: FeedFilterSettings): boolean {
    let wasChanged = false;

    // For upgrades of existing users for the rename of booleanFilterArgs
    if ("feedFilterSectionArgs" in filters) {
        console.warn(`Found old filter format "feedFilterSectionArgs:, converting to booleanFilterArgs:`, filters);
        filters.booleanFilterArgs = filters.feedFilterSectionArgs as BooleanFilterArgs[];
        delete filters.feedFilterSectionArgs;
        wasChanged = true;
    }

    const validBooleanFilterArgs = removeInvalidFilterArgs(filters.booleanFilterArgs, isBooleanFilterName);
    const validNumericFilterArgs = removeInvalidFilterArgs(filters.numericFilterArgs, isNumericFilterName);
    wasChanged ||= validBooleanFilterArgs.length !== filters.booleanFilterArgs.length;
    wasChanged ||= validNumericFilterArgs.length !== filters.numericFilterArgs.length;

    if (wasChanged) {
        console.warn(`Repaired invalid filter args:`, filters);
    }

    filters.booleanFilterArgs = validBooleanFilterArgs;
    filters.numericFilterArgs = validNumericFilterArgs;
    return wasChanged;
};


// Compute language, app, etc. tallies for toots in feed and use the result to initialize filter options
// Note that this shouldn't need to be called when initializing from storage because the filter options
// will all have been stored and reloaded along with the feed that birthed those filter options.
export function updateBooleanFilterOptions(filters: FeedFilterSettings, toots: Toot[]): FeedFilterSettings {
    const logPrefx = `[updateBooleanFilterOptions()]`
    const suppressedNonLatinTags: Record<string, StringNumberDict> = {};

    const tootCounts = Object.values(BooleanFilterName).reduce(
        (counts, propertyName) => {
            // Instantiate missing filter sections  // TODO: maybe this should happen in Storage?
            filters.booleanFilters[propertyName] ??= new BooleanFilter({title: propertyName});
            counts[propertyName as BooleanFilterName] = {} as StringNumberDict;
            return counts;
        },
        {} as Record<BooleanFilterName, StringNumberDict>
    );

    toots.forEach(toot => {
        incrementCount(tootCounts[BooleanFilterName.APP], toot.realToot().application.name);
        incrementCount(tootCounts[BooleanFilterName.LANGUAGE], toot.realToot().language);
        incrementCount(tootCounts[BooleanFilterName.USER], toot.realToot().account.webfingerURI);

        // Count tags
        // TODO: this only counts actual tags whereas the demo app filters based on containsString() so
        // the counts don't match. To fix this we'd have to go back over the toots and check for each tag
        toot.realToot().tags.forEach((tag) => {
            if (tag.language && tag.language != config.locale.language) {
                suppressedNonLatinTags[tag.language] ??= {};
                incrementCount(suppressedNonLatinTags[tag.language], tag.name);
                return;
            };

            incrementCount(tootCounts[BooleanFilterName.HASHTAG], tag.name);
        });

        // Aggregate counts for each type of toot
        Object.entries(TYPE_FILTERS).forEach(([name, typeFilter]) => {
            if (typeFilter(toot)) {
                incrementCount(tootCounts[BooleanFilterName.TYPE], name);
            }
        });
    });

    // TODO: if there's a validValues element for a filter section that is no longer in the feed
    //       the user will not be presented with the option to turn it off. This is a bug.
    Object.entries(tootCounts).forEach(([propertyName, counts]) => {
        filters.booleanFilters[propertyName as BooleanFilterName].setOptions(counts);
    });

    if (Object.keys(suppressedNonLatinTags).length) {
        const languageCounts = Object.values(suppressedNonLatinTags).map(counts => sumValues(counts));
        console.debug(`${logPrefx} Suppressed ${sumArray(languageCounts)} non-Latin hashtags:`, suppressedNonLatinTags);
    }

    Storage.setFilters(filters);  // NOTE: there's no "await" here...
    traceLog(`${logPrefx} completed, built filters:`, filters);
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

    Object.keys(filters.booleanFilters[BooleanFilterName.HASHTAG].optionInfo).forEach((tagName) => {
        toots.forEach((toot) => {
            if (toot.realToot().containsString(tagName)) {
                incrementCount(newTootTagCounts, tagName);
            }
        })
    });

    console.log(`${logPrefx} Recomputed tag counts ${ageString(startedAt)}`);
    filters.booleanFilters[BooleanFilterName.HASHTAG].setOptions(newTootTagCounts);
    Storage.setFilters(filters);
};


// Fill in any missing numeric filters
function populateMissingNumericFilters(filters: FeedFilterSettings): void {
    FILTERABLE_SCORES.forEach(scoreName => {
        filters.numericFilters[scoreName] ??= new NumericFilter({title: scoreName});
    });
};


// Remove any filter args from the list whose title is invalid
function removeInvalidFilterArgs(args: FilterArgs[], titleValidator: (title: string) => boolean): FilterArgs[] {
    const [validArgs, invalidArgs] = split(args, arg => titleValidator(arg.title));

    if (invalidArgs.length > 0) {
        console.warn(`Found invalid filter args [${invalidArgs.map(a => a.title)}]...`);
    }

    return validArgs;
};
