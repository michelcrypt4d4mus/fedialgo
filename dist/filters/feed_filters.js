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
exports.updateHashtagCounts = exports.updateBooleanFilterOptions = exports.repairFilterSettings = exports.buildNewFilterSettings = exports.buildFiltersFromArgs = exports.DEFAULT_FILTERS = void 0;
/*
 * Helpers for building and serializing a complete set of FeedFilterSettings.
 */
const boolean_filter_1 = __importStar(require("./boolean_filter"));
const numeric_filter_1 = __importStar(require("./numeric_filter"));
const Storage_1 = __importDefault(require("../Storage"));
const time_helpers_1 = require("../helpers/time_helpers");
const config_1 = require("../config");
const collection_helpers_1 = require("../helpers/collection_helpers");
const logger_1 = require("../helpers/logger");
exports.DEFAULT_FILTERS = {
    booleanFilterArgs: [],
    booleanFilters: {},
    numericFilterArgs: [],
    numericFilters: {},
};
const logger = new logger_1.Logger('feed_filters.ts');
// For building a FeedFilterSettings object from the serialized version.
// NOTE: Mutates object.
function buildFiltersFromArgs(filterArgs) {
    filterArgs.booleanFilters = filterArgs.booleanFilterArgs.reduce((filters, args) => {
        filters[args.title] = new boolean_filter_1.default(args);
        return filters;
    }, {});
    filterArgs.numericFilters = filterArgs.numericFilterArgs.reduce((filters, args) => {
        filters[args.title] = new numeric_filter_1.default(args);
        return filters;
    }, {});
    populateMissingFilters(filterArgs);
    logger.trace(`buildFiltersFromArgs() result:`, filterArgs);
    return filterArgs;
}
exports.buildFiltersFromArgs = buildFiltersFromArgs;
;
// Build a new FeedFilterSettings object with DEFAULT_FILTERS as the base.
// Start with numeric & type filters. Other BooleanFilters depend on what's in the toots.
function buildNewFilterSettings() {
    // Stringify and parse to get a deep copy of the default filters
    const filters = JSON.parse(JSON.stringify(exports.DEFAULT_FILTERS));
    populateMissingFilters(filters);
    logger.trace(`buildNewFilterSettings() result:`, filters);
    return filters;
}
exports.buildNewFilterSettings = buildNewFilterSettings;
;
// Remove filter args with invalid titles to upgrade existing users w/invalid args in browser Storage.
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
    const validBooleanFilterArgs = removeInvalidFilterArgs(filters.booleanFilterArgs, boolean_filter_1.isBooleanFilterName);
    const validNumericFilterArgs = removeInvalidFilterArgs(filters.numericFilterArgs, numeric_filter_1.isNumericFilterName);
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
;
// Compute language, app, etc. tallies for toots in feed and use the result to initialize filter options
// Note that this shouldn't need to be called when initializing from storage because the filter options
// will all have been stored and reloaded along with the feed that birthed those filter options.
async function updateBooleanFilterOptions(filters, toots) {
    const logPrefx = `<updateBooleanFilterOptions()>`;
    const suppressedNonLatinTags = {};
    populateMissingFilters(filters); // Ensure all filters are instantiated
    const tootCounts = Object.values(boolean_filter_1.BooleanFilterName).reduce((counts, propertyName) => {
        counts[propertyName] = {};
        return counts;
    }, {});
    toots.forEach(toot => {
        (0, collection_helpers_1.incrementCount)(tootCounts[boolean_filter_1.BooleanFilterName.APP], toot.realToot().application.name);
        (0, collection_helpers_1.incrementCount)(tootCounts[boolean_filter_1.BooleanFilterName.LANGUAGE], toot.realToot().language);
        (0, collection_helpers_1.incrementCount)(tootCounts[boolean_filter_1.BooleanFilterName.USER], toot.realToot().account.webfingerURI);
        // Count tags
        // TODO: this only counts actual tags whereas the demo app filters based on containsString() so
        // the counts don't match. To fix this we'd have to go back over the toots and check for each tag
        toot.realToot().tags.forEach((tag) => {
            if (tag.language && tag.language != config_1.config.locale.language) {
                suppressedNonLatinTags[tag.language] ??= {};
                (0, collection_helpers_1.incrementCount)(suppressedNonLatinTags[tag.language], tag.name);
                return;
            }
            ;
            (0, collection_helpers_1.incrementCount)(tootCounts[boolean_filter_1.BooleanFilterName.HASHTAG], tag.name);
        });
        // Aggregate counts for each type of toot
        Object.entries(boolean_filter_1.TYPE_FILTERS).forEach(([name, typeFilter]) => {
            if (typeFilter(toot)) {
                (0, collection_helpers_1.incrementCount)(tootCounts[boolean_filter_1.BooleanFilterName.TYPE], name);
            }
        });
    });
    // Build the options for all the boolean filters based on the counts
    for (const [propertyName, counts] of Object.entries(tootCounts)) {
        await filters.booleanFilters[propertyName].setOptions(counts);
    }
    if (Object.keys(suppressedNonLatinTags).length) {
        const languageCounts = Object.values(suppressedNonLatinTags).map(counts => (0, collection_helpers_1.sumValues)(counts));
        logger.debug(`${logPrefx} Suppressed ${(0, collection_helpers_1.sumArray)(languageCounts)} non-Latin hashtags:`, suppressedNonLatinTags);
    }
    Storage_1.default.setFilters(filters); // NOTE: there's no "await" here...
    logger.trace(`${logPrefx} completed, built filters:`, filters);
    return filters;
}
exports.updateBooleanFilterOptions = updateBooleanFilterOptions;
;
// We have to rescan the toots to get the tag counts because the tag counts are built with
// containsTag() whereas the demo app uses containsString() to actually filter.
// TODO: this takes 4 minutes for 3000 toots. Maybe could just do it for tags with more than some min number of toots?
function updateHashtagCounts(filters, toots) {
    const logPrefx = `<updateHashtagCounts()>`;
    const newTootTagCounts = {};
    logger.log(`${logPrefx} Launched...`);
    const startedAt = Date.now();
    Object.keys(filters.booleanFilters[boolean_filter_1.BooleanFilterName.HASHTAG].options).forEach((tagName) => {
        toots.forEach((toot) => {
            if (toot.realToot().containsString(tagName)) {
                (0, collection_helpers_1.incrementCount)(newTootTagCounts, tagName);
            }
        });
    });
    logger.log(`${logPrefx} Recomputed tag counts ${(0, time_helpers_1.ageString)(startedAt)}`);
    filters.booleanFilters[boolean_filter_1.BooleanFilterName.HASHTAG].setOptions(newTootTagCounts);
    Storage_1.default.setFilters(filters);
}
exports.updateHashtagCounts = updateHashtagCounts;
;
// Fill in any missing numeric filters (if there's no args saved nothing will be reconstructed
// when Storage tries to restore the filter objects).
function populateMissingFilters(filters) {
    numeric_filter_1.FILTERABLE_SCORES.forEach(scoreName => {
        filters.numericFilters[scoreName] ??= new numeric_filter_1.default({ title: scoreName });
    });
    Object.values(boolean_filter_1.BooleanFilterName).forEach((booleanFilterName) => {
        const filter = filters.booleanFilters[booleanFilterName];
        if (!filter) {
            logger.log(`populateMissingFilters() - No filter for ${booleanFilterName}, creating new one`);
            filters.booleanFilters[booleanFilterName] = new boolean_filter_1.default({ title: booleanFilterName });
            return;
        }
    });
}
;
// Remove any filter args from the list whose title is invalid
function removeInvalidFilterArgs(args, titleValidator) {
    const [validArgs, invalidArgs] = (0, collection_helpers_1.split)(args, arg => titleValidator(arg.title));
    if (invalidArgs.length > 0) {
        logger.warn(`Found invalid filter args [${invalidArgs.map(a => a.title)}]...`);
    }
    return validArgs;
}
;
//# sourceMappingURL=feed_filters.js.map