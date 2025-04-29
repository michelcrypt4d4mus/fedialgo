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
exports.initializeFiltersWithSummaryInfo = exports.buildNewFilterSettings = exports.buildFiltersFromArgs = exports.DEFAULT_FILTERS = void 0;
/*
 * Helpers for building and serializing a complete set of FeedFilterSettings.
 */
const numeric_filter_1 = __importStar(require("./numeric_filter"));
const property_filter_1 = __importStar(require("./property_filter"));
const Storage_1 = __importDefault(require("../Storage"));
const collection_helpers_1 = require("../helpers/collection_helpers");
const api_1 = require("../api/api");
const property_filter_2 = require("./property_filter");
exports.DEFAULT_FILTERS = {
    feedFilterSectionArgs: [],
    filterSections: {},
    numericFilterArgs: [],
    numericFilters: {},
};
// For building a FeedFilterSettings object from the serialized version. Mutates object.
function buildFiltersFromArgs(serializedFilterSettings) {
    serializedFilterSettings.filterSections ??= {};
    serializedFilterSettings.numericFilters ??= {};
    serializedFilterSettings.feedFilterSectionArgs.forEach((args) => {
        serializedFilterSettings.filterSections[args.title] = new property_filter_1.default(args);
    });
    serializedFilterSettings.numericFilterArgs.forEach((args) => {
        serializedFilterSettings.numericFilters[args.title] = new numeric_filter_1.default(args);
    });
    // Fill in any missing values
    numeric_filter_1.FILTERABLE_SCORES.forEach(weightName => {
        serializedFilterSettings.numericFilters[weightName] ??= new numeric_filter_1.default({ title: weightName });
    });
}
exports.buildFiltersFromArgs = buildFiltersFromArgs;
;
// Build a new FeedFilterSettings object with DEFAULT_FILTERS as the base.
// Start with numeric & type filters. Other PropertyFilters depend on what's in the toots.
function buildNewFilterSettings() {
    // Stringify and parse to get a deep copy of the default filters
    const filters = JSON.parse(JSON.stringify(exports.DEFAULT_FILTERS));
    filters.filterSections[property_filter_1.PropertyName.TYPE] = new property_filter_1.default({ title: property_filter_1.PropertyName.TYPE });
    numeric_filter_1.FILTERABLE_SCORES.forEach(f => filters.numericFilters[f] = new numeric_filter_1.default({ title: f }));
    return filters;
}
exports.buildNewFilterSettings = buildNewFilterSettings;
;
// Compute language, app, etc. tallies for toots in feed and use the result to initialize filter options
// TODO: just pull from instance, no need for userData arg
function initializeFiltersWithSummaryInfo(toots, userData) {
    userData ||= api_1.MastoApi.instance.userData;
    const { followedAccounts, followedTags, serverSideFilters } = userData;
    const filters = buildNewFilterSettings();
    const tootCounts = Object.values(property_filter_1.PropertyName).reduce((counts, propertyName) => {
        // Instantiate missing filter sections  // TODO: maybe this should happen in Storage?
        filters.filterSections[propertyName] ??= new property_filter_1.default({ title: propertyName });
        counts[propertyName] = {};
        return counts;
    }, {});
    toots.forEach(toot => {
        // Set toot.isFollowed flag and increment counts
        toot.isFollowed = toot.account.webfingerURI() in followedAccounts; // TODO: this is a bad place for this
        (0, collection_helpers_1.incrementCount)(tootCounts[property_filter_1.PropertyName.APP], toot.application.name);
        (0, collection_helpers_1.incrementCount)(tootCounts[property_filter_1.PropertyName.LANGUAGE], toot.language);
        (0, collection_helpers_1.incrementCount)(tootCounts[property_filter_1.PropertyName.USER], toot.account.webfingerURI());
        // Lowercase and count tags
        toot.tags.forEach((tag) => {
            toot.followedTags ??= []; // TODO why do i need this to make typescript happy?
            if (tag.name in followedTags)
                toot.followedTags.push(tag);
            (0, collection_helpers_1.incrementCount)(tootCounts[property_filter_1.PropertyName.HASHTAG], tag.name);
        });
        // Aggregate type counts
        Object.entries(property_filter_2.TYPE_FILTERS).forEach(([name, typeFilter]) => {
            if (typeFilter(toot)) {
                (0, collection_helpers_1.incrementCount)(tootCounts[property_filter_1.PropertyName.TYPE], name);
            }
        });
        // Aggregate server-side filter counts
        serverSideFilters.forEach((filter) => {
            filter.keywords.forEach((keyword) => {
                if (toot.containsString(keyword.keyword)) {
                    console.debug(`Matched server filter (${toot.describe()}):`, filter);
                    (0, collection_helpers_1.incrementCount)(tootCounts[property_filter_1.PropertyName.SERVER_SIDE_FILTERS], keyword.keyword);
                }
            });
        });
    });
    // TODO: if there's a validValues element for a filter section that is no longer in the feed
    //       the user will not be presented with the option to turn it off. This is a bug.
    Object.entries(tootCounts).forEach(([propertyName, counts]) => {
        filters.filterSections[propertyName].setOptions(counts);
    });
    Storage_1.default.setFilters(filters);
    console.debug(`repairFeedAndExtractSummaryInfo() completed, built filters:`, filters);
    return filters;
}
exports.initializeFiltersWithSummaryInfo = initializeFiltersWithSummaryInfo;
//# sourceMappingURL=feed_filters.js.map