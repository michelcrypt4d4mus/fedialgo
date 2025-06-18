/*
 * Helpers for building and serializing a complete set of FeedFilterSettings.
 */
import Account from "../api/objects/account";
import BooleanFilter, { TYPE_FILTERS, type BooleanFilterArgs } from "./boolean_filter";
import MastoApi from "../api/api";
import NumericFilter, { FILTERABLE_SCORES, type NumericFilterArgs } from "./numeric_filter";
import Storage from "../Storage";
import TagsForFetchingToots from "../api/tags_for_fetching_toots";
import Toot from "../api/objects/toot";
import { BooleanFilterName, ScoreName, TagTootsType } from '../enums';
import { BooleanFilterOptionList } from "../api/counted_list";
import { config } from "../config";
import { incrementCount, sumArray, sumValues } from "../helpers/collection_helpers";
import { languageName } from "../helpers/language_helper";
import { Logger } from '../helpers/logger';
import {
    type BooleanFilterOption,
    type BooleanFilters,
    type FeedFilterSettings,
    type NumericFilters,
    type StringNumberDict,
    type TootNumberProp,
} from "../types";

type DictOfDicts = Record<string, StringNumberDict>;
type FilterOptions = Record<BooleanFilterName, BooleanFilterOptionList>;

const DEFAULT_FILTERS: FeedFilterSettings = {
    booleanFilterArgs: [],
    booleanFilters: {} as BooleanFilters,
    numericFilterArgs: [],
    numericFilters: {} as NumericFilters,
};

const logger = new Logger('feed_filters.ts');


// Build a new FeedFilterSettings object with DEFAULT_FILTERS as the base.
// Start with numeric & type filters. Other BooleanFilters depend on what's in the toots.
export function buildNewFilterSettings(): FeedFilterSettings {
    const filters: FeedFilterSettings = JSON.parse(JSON.stringify(DEFAULT_FILTERS)); // Deep copy
    populateMissingFilters(filters);
    return filters;
}


// For building a FeedFilterSettings object from the serialized version.
// NOTE: Mutates object.
export function buildFiltersFromArgs(filterArgs: FeedFilterSettings): FeedFilterSettings {
    filterArgs.booleanFilters = filterArgs.booleanFilterArgs.reduce((filters, args) => {
        filters[args.propertyName as BooleanFilterName] = new BooleanFilter(args);
        return filters
    }, {} as BooleanFilters);

    filterArgs.numericFilters = filterArgs.numericFilterArgs.reduce((filters, args) => {
        filters[args.propertyName as TootNumberProp] = new NumericFilter(args);
        return filters
    }, {} as NumericFilters);

    populateMissingFilters(filterArgs);
    logger.trace(`buildFiltersFromArgs() result:`, filterArgs);
    return filterArgs;
}


// Remove filter args with invalid propertyName to upgrade existing users w/invalid args in browser Storage.
// Returns true if the filter settings were changed.
export function repairFilterSettings(filters: FeedFilterSettings): boolean {
    let wasChanged = false;

    // For upgrades of existing users for the rename of booleanFilterArgs
    if ("feedFilterSectionArgs" in filters) {
        logger.warn(`Found old filter format "feedFilterSectionArgs:, converting to booleanFilterArgs:`, filters);
        filters.booleanFilterArgs = filters.feedFilterSectionArgs as BooleanFilterArgs[];
        delete filters.feedFilterSectionArgs;
        wasChanged = true;
    }

    const validBooleanFilterArgs = BooleanFilter.removeInvalidFilterArgs(filters.booleanFilterArgs, logger);
    const validNumericFilterArgs = NumericFilter.removeInvalidFilterArgs(filters.numericFilterArgs, logger);
    wasChanged ||= validBooleanFilterArgs.length !== filters.booleanFilterArgs.length;
    wasChanged ||= validNumericFilterArgs.length !== filters.numericFilterArgs.length;

    if (wasChanged) {
        logger.warn(`Repaired invalid filter args:`, filters);
    }

    filters.booleanFilterArgs = validBooleanFilterArgs as BooleanFilterArgs[];
    filters.numericFilterArgs = validNumericFilterArgs as NumericFilterArgs[];
    return wasChanged;
}


/**
 * Compute language, app, etc. tallies for toots in feed and use the result to initialize filter options
 * Note that this shouldn't need to be called when initializing from storage because the filter options
 * will all have been stored and reloaded along with the feed that birthed those filter options.
 * @param {FeedFilterSettings} filters - The filter settings to update with new options.
 * @param {Toot[]} toots - The toots to analyze for filter options.
 * @returns {Promise<void>} A promise that resolves when the filter options have been updated.
 */
export async function updateBooleanFilterOptions(filters: FeedFilterSettings, toots: Toot[]): Promise<void> {
    populateMissingFilters(filters);  // Ensure all filters are instantiated
    const tagLists = await TagsForFetchingToots.rawTagLists();
    const userData = await MastoApi.instance.getUserData();
    const suppressedNonLatinTags: DictOfDicts = {};

    const optionLists: FilterOptions = Object.values(BooleanFilterName).reduce((lists, filterName) => {
        lists[filterName] = new BooleanFilterOptionList([], filterName as BooleanFilterName);
        return lists;
    }, {} as FilterOptions);

    const decorateAccount = (accountOption: BooleanFilterOption, account: Account): void => {
        accountOption.displayName = account.displayName;
        const favouriteAccountProps = userData.favouriteAccounts.getObj(accountOption.name);

        if (favouriteAccountProps) {
            accountOption.isFollowed = favouriteAccountProps.isFollowed;
            accountOption[ScoreName.FAVOURITED_ACCOUNTS] = favouriteAccountProps.numToots || 0;
        }
    };

    const decorateHashtag = (tagOption: BooleanFilterOption): void => {
        Object.entries(tagLists).forEach(([key, tagList]) => {
            const propertyObj = tagList.getObj(tagOption.name);

            if (propertyObj) {
                tagOption[key as TagTootsType] = propertyObj.numToots || 0;
            }
        });

        if (userData.followedTags.getObj(tagOption.name)) {
            tagOption.isFollowed = true;
        }
    };

    const decorateLanguage = (languageOption: BooleanFilterOption): void => {
        languageOption.displayName = languageName(languageOption.name);
        const languageUsage = userData.languagesPostedIn.getObj(languageOption.name);

        if (languageUsage) {
            languageOption[BooleanFilterName.LANGUAGE] = languageUsage.numToots || 0;
        }
    };

    toots.forEach(toot => {
        const decorateThisAccount = (option: BooleanFilterOption) => decorateAccount(option, toot.author);
        optionLists[BooleanFilterName.USER].incrementCount(toot.author.webfingerURI, decorateThisAccount);
        optionLists[BooleanFilterName.APP].incrementCount(toot.realToot.application.name);
        optionLists[BooleanFilterName.SERVER].incrementCount(toot.homeserver);
        optionLists[BooleanFilterName.LANGUAGE].incrementCount(toot.realToot.language!, decorateLanguage);

        // Aggregate counts for each kind ("type") of toot
        Object.entries(TYPE_FILTERS).forEach(([name, typeFilter]) => {
            if (typeFilter(toot)) {
                optionLists[BooleanFilterName.TYPE].incrementCount(name);
            }
        });

        // Count tags // TODO: this only counts actual tags whereas the demo app filters based on
        // containsString() so the counts don't match. To fix this we'd have to go back over the toots
        // and check for each tag but that is for now too slow.
        toot.realToot.tags.forEach((tag) => {
            // Suppress non-Latin script tags unless they match the user's language
            if (tag.language && tag.language != config.locale.language) {
                suppressedNonLatinTags[tag.language] ??= {};
                incrementCount(suppressedNonLatinTags[tag.language], tag.name);
            } else {
                optionLists[BooleanFilterName.HASHTAG].incrementCount(tag.name, decorateHashtag);
            }
        });
    });

    // Build the options for all the boolean filters based on the counts
    Object.keys(optionLists).forEach((key) => {
        const filterName = key as BooleanFilterName;
        filters.booleanFilters[filterName].options = optionLists[filterName];
    });

    logSuppressedHashtags(suppressedNonLatinTags);
    await Storage.setFilters(filters);
    logger.trace(`Updated filters:`, filters);
}


// We have to rescan the toots to get the tag counts because the tag counts are built with
// containsTag() whereas the demo app uses containsString() to actually filter.
// TODO: this takes 4 minutes for 3000 toots. Maybe could just do it for tags with more than some min number of toots?
// export function updateHashtagCounts(filters: FeedFilterSettings, toots: Toot[],): void {
//     const logPrefx = `<updateHashtagCounts()>`;
//     const newTootTagCounts = {} as StringNumberDict;
//     filterLogger.log(`${logPrefx} Launched...`);
//     const startedAt = Date.now();

//     Object.keys(filters.booleanFilters[BooleanFilterName.HASHTAG].options).forEach((tagName) => {
//         toots.forEach((toot) => {
//             if (toot.realToot.containsString(tagName)) {
//                 incrementCount(newTootTagCounts, tagName);
//             }
//         })
//     });

//     filterLogger.log(`${logPrefx} Recomputed tag counts ${ageString(startedAt)}`);
//     filters.booleanFilters[BooleanFilterName.HASHTAG].setOptions(newTootTagCounts);
//     Storage.setFilters(filters);
// };


// Simple logging helper
function logSuppressedHashtags(suppressedHashtags: DictOfDicts): void {
    if (Object.keys(suppressedHashtags).length) {
        const languageCounts = Object.values(suppressedHashtags).map(counts => sumValues(counts));
        logger.debug(`Suppressed ${sumArray(languageCounts)} non-Latin hashtags:`, suppressedHashtags);
    }
}


// Fill in any missing numeric filters (if there's no args saved nothing will be reconstructed
// when Storage tries to restore the filter objects).
function populateMissingFilters(filters: FeedFilterSettings): void {
    const thisLogger = logger.tempLogger("populateMissingFilters");

    FILTERABLE_SCORES.forEach(scoreName => {
        if (!filters.numericFilters[scoreName]) {
            thisLogger.trace(`No NumericFilter for ${scoreName}, creating new one`);
            filters.numericFilters[scoreName] ??= new NumericFilter({propertyName: scoreName});
        }
    });

    Object.values(BooleanFilterName).forEach((booleanFilterName) => {
        if (!filters.booleanFilters[booleanFilterName]) {
            thisLogger.trace(`No BooleanFilter for ${booleanFilterName}, creating new one`);
            filters.booleanFilters[booleanFilterName] = new BooleanFilter({propertyName: booleanFilterName});
        }
    });
}
