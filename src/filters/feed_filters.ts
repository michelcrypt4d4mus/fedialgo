/*
 * Helpers for building and serializing a complete set of FeedFilterSettings.
 */
import BooleanFilter, { TYPE_FILTERS, type BooleanFilterArgs } from "./boolean_filter";
import MastoApi from "../api/api";
import NumericFilter, { FILTERABLE_SCORES, type NumericFilterArgs } from "./numeric_filter";
import Storage from "../Storage";
import TagsForFetchingToots from "../api/tags_for_fetching_toots";
import type Account from "../api/objects/account";
import type TagList from "../api/tag_list";
import type Toot from "../api/objects/toot";
import { ageString, WaitTime } from "../helpers/time_helpers";
import { BooleanFilterName, ScoreName, TagTootsCategory } from '../enums';
import { BooleanFilterOptionList } from "../api/counted_list";
import { config } from "../config";
import { incrementCount, sortedDictString, sumValues } from "../helpers/collection_helpers";
import { isDebugMode } from "../helpers/environment_helpers";
import { isValidForSubstringSearch } from "../api/objects/tag";
import { languageName } from "../helpers/language_helper";
import { Logger } from '../helpers/logger';
import { suppressedHashtags } from "../helpers/suppressed_hashtags";
import {
    type BooleanFilterOption,
    type BooleanFilters,
    type FeedFilterSettings,
    type NumericFilters,
    type StringNumberDict,
    type TagWithUsageCounts,
    type TootNumberProp,
} from "../types";

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
    // TODO: remove this eventually
    if ("feedFilterSectionArgs" in filters) {
        logger.warn(`Old filter format "feedFilterSectionArgs:, converting to booleanFilterArgs:`, filters);
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
 * @param {boolean} [scanForTags=false] - Whether to scan followed tags for counts.
 * @returns {Promise<void>} A promise that resolves when the filter options have been updated.
 */
export async function updateBooleanFilterOptions(
    filters: FeedFilterSettings,
    toots: Toot[],
    scanForTags: boolean = false
): Promise<void> {
    populateMissingFilters(filters);  // Ensure all filters are instantiated
    const timer = new WaitTime();
    const tagLists = await TagsForFetchingToots.rawTagLists();
    const userData = await MastoApi.instance.getUserData();

    const optionLists: FilterOptions = Object.values(BooleanFilterName).reduce(
        (lists, filterName) => {
            lists[filterName] = new BooleanFilterOptionList([], filterName);
            return lists;
        },
        {} as FilterOptions
    );

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
                tagOption[key as TagTootsCategory] = propertyObj.numToots || 0;
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
                suppressedHashtags.increment(tag, toot.realToot);
            } else {
                optionLists[BooleanFilterName.HASHTAG].incrementCount(tag.name, decorateHashtag);
            }
        });
    });

    // Double check for hashtags that are in the feed but without a formal "#" character.
    if (scanForTags) {
        const hashtagOptions = optionLists[BooleanFilterName.HASHTAG];
        optionLists[BooleanFilterName.HASHTAG] = updateHashtagCounts(hashtagOptions, userData.followedTags, toots);
    }

    // Build the options for all the boolean filters based on the counts
    Object.keys(optionLists).forEach((key) => {
        const filterName = key as BooleanFilterName;
        filters.booleanFilters[filterName].options = optionLists[filterName];
    });

    suppressedHashtags.log(logger);
    await Storage.setFilters(filters);
    const msg = `Updated all filters ${timer.ageString()}`
    isDebugMode ? logger.trace(msg, filters) : logger.debug(msg);
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


/**
 * Scan a list of Toots for a set of hashtags and update their counts in the provided hashtagOptions.
 * Currently used to update followed hashtags only because otherwise it's too slow.
 *
 * NOTE: Scanning all elements of hashtagOptions against all Toots takes 75 seconds for a feed with 1,500 toots
 * which is why we only currently do it for followed tags. Even scanning for just followed tags takes
 * 3-4 seconds for a list of 138 followed tags against 3,000 toots.
 *
 * @private
 * @param {BooleanFilterOptionList} options - Options list to update with additional hashtag matches.
 * @param {TagList} followedTags - List of followed tags to check against.
 * @param {Toot[]} toots - List of toots to scan.
 */
function updateHashtagCounts(
    options: BooleanFilterOptionList,
    followedTags: TagList,
    toots: Toot[]
): BooleanFilterOptionList {
    const startedAt = Date.now();
    const tagsFound: StringNumberDict = {};

    // Add followedTags to the options list so we can increment their counts if found.
    const allOptions = new BooleanFilterOptionList(options.objs, options.source);
    allOptions.addObjs(followedTags.objs.map(tag => { return {name: tag.name, isFollowed: true} }));
    let followedTagsFound = 0;

    allOptions.topObjs().forEach((option) => {
        const tag = option as TagWithUsageCounts;

        // Skip invalid tags and those that don't already appear in the hashtagOptions.
        if (!(isValidForSubstringSearch(tag) && options.getObj(tag.name))) {
            return;
        }

        toots.forEach((toot) => {
            if (toot.realToot.containsTag(tag, true) && !toot.realToot.containsTag(tag)) {
                allOptions.incrementCount(tag.name);
                incrementCount(tagsFound, tag.name);

                if (option.isFollowed) {
                    followedTagsFound++;
                }
            }
        });
    });

    logger.info(
        `updateHashtagCounts() found ${sumValues(tagsFound)} more matches for ${Object.keys(tagsFound).length} of` +
        ` ${allOptions.length} tags in ${toots.length} Toots ${ageString(startedAt)} (${followedTagsFound} followed tags): ` +
        sortedDictString(tagsFound)
    );

    return allOptions;
}
