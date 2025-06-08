/*
 * Helpers for building and serializing a complete set of FeedFilterSettings.
 */
import Account from "../api/objects/account";
import BooleanFilter, { TYPE_FILTERS, BooleanFilterArgs, BooleanFilterOptionList, isBooleanFilterName } from "./boolean_filter";
import MastoApi from "../api/api";
import NumericFilter, { FILTERABLE_SCORES, isNumericFilterName } from "./numeric_filter";
import Storage from "../Storage";
import TagsForFetchingToots from "../api/tags_for_fetching_toots";
import Toot from "../api/objects/toot";
import { BooleanFilterName, ScoreName, TagTootsCacheKey } from '../enums';
import { config } from "../config";
import { incrementCount, split, sumArray, sumValues } from "../helpers/collection_helpers";
import { languageName } from "../helpers/language_helper";
import { Logger } from '../helpers/logger';
import {
    type BooleanFilterOption,
    type BooleanFilters,
    type FeedFilterSettings,
    type FilterArgs,
    type NumericFilters,
    type StringNumberDict,
    type TootNumberProp,
} from "../types";

export const DEFAULT_FILTERS = {
    booleanFilterArgs: [],
    booleanFilters: {} as BooleanFilters,
    numericFilterArgs: [],
    numericFilters: {} as NumericFilters,
} as FeedFilterSettings;

type FilterOptions = Record<BooleanFilterName, BooleanFilterOptionList>;

const filterLogger = new Logger('feed_filters.ts');


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

    populateMissingFilters(filterArgs);
    filterLogger.trace(`buildFiltersFromArgs() result:`, filterArgs);
    return filterArgs;
};


// Build a new FeedFilterSettings object with DEFAULT_FILTERS as the base.
// Start with numeric & type filters. Other BooleanFilters depend on what's in the toots.
export function buildNewFilterSettings(): FeedFilterSettings {
    // Stringify and parse to get a deep copy of the default filters
    const filters = JSON.parse(JSON.stringify(DEFAULT_FILTERS)) as FeedFilterSettings;
    populateMissingFilters(filters);
    filterLogger.trace(`buildNewFilterSettings() result:`, filters);
    return filters;
};


// Remove filter args with invalid titles to upgrade existing users w/invalid args in browser Storage.
// Returns true if the filter settings were changed.
export function repairFilterSettings(filters: FeedFilterSettings): boolean {
    let wasChanged = false;

    // For upgrades of existing users for the rename of booleanFilterArgs
    if ("feedFilterSectionArgs" in filters) {
        filterLogger.warn(`Found old filter format "feedFilterSectionArgs:, converting to booleanFilterArgs:`, filters);
        filters.booleanFilterArgs = filters.feedFilterSectionArgs as BooleanFilterArgs[];
        delete filters.feedFilterSectionArgs;
        wasChanged = true;
    }

    const validBooleanFilterArgs = removeInvalidFilterArgs(filters.booleanFilterArgs, isBooleanFilterName);
    const validNumericFilterArgs = removeInvalidFilterArgs(filters.numericFilterArgs, isNumericFilterName);
    wasChanged ||= validBooleanFilterArgs.length !== filters.booleanFilterArgs.length;
    wasChanged ||= validNumericFilterArgs.length !== filters.numericFilterArgs.length;

    if (wasChanged) {
        filterLogger.warn(`Repaired invalid filter args:`, filters);
    }

    filters.booleanFilterArgs = validBooleanFilterArgs as BooleanFilterArgs[];
    filters.numericFilterArgs = validNumericFilterArgs;
    return wasChanged;
};


// Compute language, app, etc. tallies for toots in feed and use the result to initialize filter options
// Note that this shouldn't need to be called when initializing from storage because the filter options
// will all have been stored and reloaded along with the feed that birthed those filter options.
export async function updateBooleanFilterOptions(filters: FeedFilterSettings, toots: Toot[]): Promise<FeedFilterSettings> {
    populateMissingFilters(filters);  // Ensure all filters are instantiated
    const logger = filterLogger.tempLogger('updateBooleanFilterOptions');
    const tagLists = await TagsForFetchingToots.rawTagLists();
    const userData = await MastoApi.instance.getUserData();
    const suppressedNonLatinTags: Record<string, StringNumberDict> = {};

    const optionLists: FilterOptions = Object.values(BooleanFilterName).reduce((lists, filterName) => {
        lists[filterName] = new BooleanFilterOptionList([], filterName as BooleanFilterName);
        return lists;
    }, {} as FilterOptions);

    const decorateHashtag = (tagOption: BooleanFilterOption): void => {
        Object.entries(tagLists).forEach(([key, tagList]) => {
            const propertyObj = tagList.getObj(tagOption.name);

            if (propertyObj) {
                tagOption[key as TagTootsCacheKey] = propertyObj.numToots || 0;
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

    const decorateAccount = (accountOption: BooleanFilterOption, account: Account): void => {
        accountOption.displayName = account.displayName;
        const favouriteAccountProps = userData.favouriteAccounts.getObj(accountOption.name);

        if (favouriteAccountProps) {
            accountOption.isFollowed = favouriteAccountProps.isFollowed;
            accountOption[ScoreName.FAVOURITED_ACCOUNTS] = favouriteAccountProps.numToots || 0;
        }
    };

    toots.forEach(toot => {
        const decorateThisAccount = (option: BooleanFilterOption) => decorateAccount(option, toot.author());
        optionLists[BooleanFilterName.USER].incrementCount(toot.author().webfingerURI, decorateThisAccount);
        optionLists[BooleanFilterName.APP].incrementCount(toot.realToot().application.name);
        optionLists[BooleanFilterName.LANGUAGE].incrementCount(toot.realToot().language!, decorateLanguage);

        // Aggregate counts for each kind ("type") of toot
        Object.entries(TYPE_FILTERS).forEach(([name, typeFilter]) => {
            if (typeFilter(toot)) {
                optionLists[BooleanFilterName.TYPE].incrementCount(name);
            }
        });

        // Count tags // TODO: this only counts actual tags whereas the demo app filters based on
        // containsString() so the counts don't match. To fix this we'd have to go back over the toots
        // and check for each tag but that is for now too slow.
        toot.realToot().tags.forEach((tag) => {
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

    if (Object.keys(suppressedNonLatinTags).length) {
        const languageCounts = Object.values(suppressedNonLatinTags).map(counts => sumValues(counts));
        logger.debug(`Suppressed ${sumArray(languageCounts)} non-Latin hashtags:`, suppressedNonLatinTags);
    }

    await Storage.setFilters(filters);
    logger.trace(`Completed, built filters:`, filters);
    return filters;
};


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
//             if (toot.realToot().containsString(tagName)) {
//                 incrementCount(newTootTagCounts, tagName);
//             }
//         })
//     });

//     filterLogger.log(`${logPrefx} Recomputed tag counts ${ageString(startedAt)}`);
//     filters.booleanFilters[BooleanFilterName.HASHTAG].setOptions(newTootTagCounts);
//     Storage.setFilters(filters);
// };


// Fill in any missing numeric filters (if there's no args saved nothing will be reconstructed
// when Storage tries to restore the filter objects).
function populateMissingFilters(filters: FeedFilterSettings): void {
    FILTERABLE_SCORES.forEach(scoreName => {
        filters.numericFilters[scoreName] ??= new NumericFilter({title: scoreName});
    });

    Object.values(BooleanFilterName).forEach((booleanFilterName) => {
        const filter = filters.booleanFilters[booleanFilterName];

        if (!filter) {
            filterLogger.log(`populateMissingFilters() - No filter for ${booleanFilterName}, creating new one`);
            filters.booleanFilters[booleanFilterName] = new BooleanFilter({title: booleanFilterName});
            return;
        }
    });
};


// Remove any filter args from the list whose title is invalid
function removeInvalidFilterArgs(args: FilterArgs[], titleValidator: (title: string) => boolean): FilterArgs[] {
    const [validArgs, invalidArgs] = split(args, arg => titleValidator(arg.title));

    if (invalidArgs.length > 0) {
        filterLogger.warn(`Found invalid filter args [${invalidArgs.map(a => a.title)}]...`);
    }

    return validArgs;
};
