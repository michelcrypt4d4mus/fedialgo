"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBooleanFilterOptions = exports.repairFilterSettings = exports.buildFiltersFromArgs = exports.buildNewFilterSettings = void 0;
const boolean_filter_1 = __importStar(require("./boolean_filter"));
const api_1 = __importDefault(require("../api/api"));
const numeric_filter_1 = __importStar(require("./numeric_filter"));
const Storage_1 = __importDefault(require("../Storage"));
const tags_for_fetching_toots_1 = __importDefault(require("../api/tags_for_fetching_toots"));
const time_helpers_1 = require("../helpers/time_helpers");
const enums_1 = require("../enums");
const counted_list_1 = require("../api/counted_list");
const config_1 = require("../config");
const tag_1 = require("../api/objects/tag");
const language_helper_1 = require("../helpers/language_helper");
const logger_1 = require("../helpers/logger");
const suppressed_hashtags_1 = require("../helpers/suppressed_hashtags");
const DEFAULT_FILTERS = {
    booleanFilterArgs: [],
    booleanFilters: {},
    numericFilterArgs: [],
    numericFilters: {},
};
const logger = new logger_1.Logger('feed_filters.ts');
const taggishLogger = logger.tempLogger("updateHashtagCounts");
// Build a new FeedFilterSettings object with DEFAULT_FILTERS as the base.
// Start with numeric & type filters. Other BooleanFilters depend on what's in the toots.
function buildNewFilterSettings() {
    const filters = JSON.parse(JSON.stringify(DEFAULT_FILTERS)); // Deep copy
    populateMissingFilters(filters);
    return filters;
}
exports.buildNewFilterSettings = buildNewFilterSettings;
// For building a FeedFilterSettings object from the serialized version.
// NOTE: Mutates object.
function buildFiltersFromArgs(filterArgs) {
    filterArgs.booleanFilters = filterArgs.booleanFilterArgs.reduce((filters, args) => {
        filters[args.propertyName] = new boolean_filter_1.default(args);
        return filters;
    }, {});
    filterArgs.numericFilters = filterArgs.numericFilterArgs.reduce((filters, args) => {
        filters[args.propertyName] = new numeric_filter_1.default(args);
        return filters;
    }, {});
    populateMissingFilters(filterArgs);
    logger.trace(`buildFiltersFromArgs() result:`, filterArgs);
    return filterArgs;
}
exports.buildFiltersFromArgs = buildFiltersFromArgs;
// Remove filter args with invalid propertyName to upgrade existing users w/invalid args in browser Storage.
// Returns true if the filter settings were changed.
function repairFilterSettings(filters) {
    let wasChanged = false;
    // For upgrades of existing users for the rename of booleanFilterArgs
    if ("feedFilterSectionArgs" in filters) {
        logger.warn(`Found old filter format "feedFilterSectionArgs:, converting to booleanFilterArgs:`, filters);
        filters.booleanFilterArgs = filters.feedFilterSectionArgs;
        delete filters.feedFilterSectionArgs;
        wasChanged = true;
    }
    const validBooleanFilterArgs = boolean_filter_1.default.removeInvalidFilterArgs(filters.booleanFilterArgs, logger);
    const validNumericFilterArgs = numeric_filter_1.default.removeInvalidFilterArgs(filters.numericFilterArgs, logger);
    wasChanged ||= validBooleanFilterArgs.length !== filters.booleanFilterArgs.length;
    wasChanged ||= validNumericFilterArgs.length !== filters.numericFilterArgs.length;
    if (wasChanged) {
        logger.warn(`Repaired invalid filter args:`, filters);
    }
    filters.booleanFilterArgs = validBooleanFilterArgs;
    filters.numericFilterArgs = validNumericFilterArgs;
    return wasChanged;
}
exports.repairFilterSettings = repairFilterSettings;
/**
 * Compute language, app, etc. tallies for toots in feed and use the result to initialize filter options
 * Note that this shouldn't need to be called when initializing from storage because the filter options
 * will all have been stored and reloaded along with the feed that birthed those filter options.
 * @param {FeedFilterSettings} filters - The filter settings to update with new options.
 * @param {Toot[]} toots - The toots to analyze for filter options.
 * @param {boolean} [scanFollowedTags=false] - Whether to scan followed tags for counts.
 * @returns {Promise<void>} A promise that resolves when the filter options have been updated.
 */
async function updateBooleanFilterOptions(filters, toots, scanFollowedTags = false) {
    populateMissingFilters(filters); // Ensure all filters are instantiated
    const tagLists = await tags_for_fetching_toots_1.default.rawTagLists();
    const userData = await api_1.default.instance.getUserData();
    const optionLists = Object.values(enums_1.BooleanFilterName).reduce((lists, filterName) => {
        lists[filterName] = new counted_list_1.BooleanFilterOptionList([], filterName);
        return lists;
    }, {});
    const decorateAccount = (accountOption, account) => {
        accountOption.displayName = account.displayName;
        const favouriteAccountProps = userData.favouriteAccounts.getObj(accountOption.name);
        if (favouriteAccountProps) {
            accountOption.isFollowed = favouriteAccountProps.isFollowed;
            accountOption[enums_1.ScoreName.FAVOURITED_ACCOUNTS] = favouriteAccountProps.numToots || 0;
        }
    };
    const decorateHashtag = (tagOption) => {
        Object.entries(tagLists).forEach(([key, tagList]) => {
            const propertyObj = tagList.getObj(tagOption.name);
            if (propertyObj) {
                tagOption[key] = propertyObj.numToots || 0;
            }
        });
        if (userData.followedTags.getObj(tagOption.name)) {
            tagOption.isFollowed = true;
        }
    };
    const decorateLanguage = (languageOption) => {
        languageOption.displayName = (0, language_helper_1.languageName)(languageOption.name);
        const languageUsage = userData.languagesPostedIn.getObj(languageOption.name);
        if (languageUsage) {
            languageOption[enums_1.BooleanFilterName.LANGUAGE] = languageUsage.numToots || 0;
        }
    };
    toots.forEach(toot => {
        const decorateThisAccount = (option) => decorateAccount(option, toot.author);
        optionLists[enums_1.BooleanFilterName.USER].incrementCount(toot.author.webfingerURI, decorateThisAccount);
        optionLists[enums_1.BooleanFilterName.APP].incrementCount(toot.realToot.application.name);
        optionLists[enums_1.BooleanFilterName.SERVER].incrementCount(toot.homeserver);
        optionLists[enums_1.BooleanFilterName.LANGUAGE].incrementCount(toot.realToot.language, decorateLanguage);
        // Aggregate counts for each kind ("type") of toot
        Object.entries(boolean_filter_1.TYPE_FILTERS).forEach(([name, typeFilter]) => {
            if (typeFilter(toot)) {
                optionLists[enums_1.BooleanFilterName.TYPE].incrementCount(name);
            }
        });
        // Count tags // TODO: this only counts actual tags whereas the demo app filters based on
        // containsString() so the counts don't match. To fix this we'd have to go back over the toots
        // and check for each tag but that is for now too slow.
        toot.realToot.tags.forEach((tag) => {
            // Suppress non-Latin script tags unless they match the user's language
            if (tag.language && tag.language != config_1.config.locale.language) {
                suppressed_hashtags_1.suppressedHashtags.increment(tag, toot.realToot);
            }
            else {
                optionLists[enums_1.BooleanFilterName.HASHTAG].incrementCount(tag.name, decorateHashtag);
            }
        });
    });
    // Double check for any followed hashtags that are in the feed but without a formal "#" character.
    if (scanFollowedTags) {
        updateHashtagCounts(optionLists[enums_1.BooleanFilterName.HASHTAG], userData.followedTags, toots);
    }
    // Build the options for all the boolean filters based on the counts
    Object.keys(optionLists).forEach((key) => {
        const filterName = key;
        filters.booleanFilters[filterName].options = optionLists[filterName];
    });
    suppressed_hashtags_1.suppressedHashtags.log(logger);
    await Storage_1.default.setFilters(filters);
    logger.trace(`Updated filters:`, filters);
}
exports.updateBooleanFilterOptions = updateBooleanFilterOptions;
// Fill in any missing numeric filters (if there's no args saved nothing will be reconstructed
// when Storage tries to restore the filter objects).
function populateMissingFilters(filters) {
    const thisLogger = logger.tempLogger("populateMissingFilters");
    numeric_filter_1.FILTERABLE_SCORES.forEach(scoreName => {
        if (!filters.numericFilters[scoreName]) {
            thisLogger.trace(`No NumericFilter for ${scoreName}, creating new one`);
            filters.numericFilters[scoreName] ??= new numeric_filter_1.default({ propertyName: scoreName });
        }
    });
    Object.values(enums_1.BooleanFilterName).forEach((booleanFilterName) => {
        if (!filters.booleanFilters[booleanFilterName]) {
            thisLogger.trace(`No BooleanFilter for ${booleanFilterName}, creating new one`);
            filters.booleanFilters[booleanFilterName] = new boolean_filter_1.default({ propertyName: booleanFilterName });
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
 * @param {BooleanFilterOptionList} hashtagOptions - Options list to update with additional hashtag matches.
 * @param {TagList} tags - List of tags to check against the toots.
 * @param {Toot[]} toots - List of toots to scan.
 */
function updateHashtagCounts(hashtagOptions, tags, toots) {
    const startedAt = Date.now();
    tags.forEach((option) => {
        const tag = option;
        // Skip invalid tags and those that don't already appear in the hashtagOptions.
        if (!(0, tag_1.isValidForSubstringSearch)(tag) || !hashtagOptions.getObj(tag.name)) {
            return;
        }
        toots.forEach((toot) => {
            if (!toot.realToot.containsTag(tag) && toot.realToot.containsString(tag.name)) {
                taggishLogger.trace(`Incrementing count for followed tag "${tag.name}"...`);
                hashtagOptions.incrementCount(tag.name);
            }
        });
    });
    taggishLogger.log(`Updated tag counts for ${tags.length} tags in ${toots.length} Toots ${(0, time_helpers_1.ageString)(startedAt)}`);
}
//# sourceMappingURL=feed_filters.js.map