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
Object.defineProperty(exports, "__esModule", { value: true });
exports.populateFiltersFromArgs = exports.buildNewFilterSettings = exports.DEFAULT_CONFIG = exports.DEFAULT_FILTERS = exports.DEFAULT_WEIGHTS = void 0;
/*
 * Centralized location for non-user configurable settings.
 */
const numeric_filter_1 = __importStar(require("./filters/numeric_filter"));
const property_filter_1 = __importStar(require("./filters/property_filter"));
const types_1 = require("./types");
exports.DEFAULT_WEIGHTS = {
    [types_1.WeightName.CHAOS]: {
        defaultWeight: 1,
        description: "Insert Chaos into the scoring (social media ist krieg)",
    },
    [types_1.WeightName.DIVERSITY]: {
        defaultWeight: 1,
        description: "Disfavour accounts that are tooting a lot right now",
    },
    [types_1.WeightName.FAVORITED_ACCOUNTS]: {
        defaultWeight: 1,
        description: "Favour accounts you often favourite",
    },
    [types_1.WeightName.FOLLOWED_TAGS]: {
        defaultWeight: 2,
        description: "Favour toots that contain hashtags you are following",
    },
    [types_1.WeightName.IMAGE_ATTACHMENTS]: {
        defaultWeight: 0,
        description: "Favour image attachments",
    },
    [types_1.WeightName.INTERACTIONS]: {
        defaultWeight: 2,
        description: "Favour accounts that recently interacted with your toots",
    },
    [types_1.WeightName.MOST_REPLIED_ACCOUNTS]: {
        defaultWeight: 1,
        description: "Favour accounts you often reply to",
    },
    [types_1.WeightName.MOST_RETOOTED_ACCOUNTS]: {
        defaultWeight: 3,
        description: "Favour accounts you often retoot",
    },
    [types_1.WeightName.NUM_FAVOURITES]: {
        defaultWeight: 1,
        description: "Favour things favourited by users on your home server",
    },
    [types_1.WeightName.NUM_REPLIES]: {
        defaultWeight: 1,
        description: "Favour toots with lots of replies",
    },
    [types_1.WeightName.NUM_RETOOTS]: {
        defaultWeight: 1,
        description: "Favour toots that are retooted a lot",
    },
    [types_1.WeightName.RETOOTED_IN_FEED]: {
        defaultWeight: 2,
        description: "Favour toots retooted by multiple accounts you follow",
    },
    [types_1.WeightName.TIME_DECAY]: {
        defaultWeight: 0.05,
        description: "Higher values favour recent toots more",
        minValue: 0.001,
    },
    [types_1.WeightName.TRENDING_TAGS]: {
        defaultWeight: 0.4,
        description: "Favour hashtags that are trending in the Fediverse",
    },
    [types_1.WeightName.TRENDING_TOOTS]: {
        defaultWeight: 0.08,
        description: "Favour toots that are trending in the Fediverse",
    },
    [types_1.WeightName.VIDEO_ATTACHMENTS]: {
        defaultWeight: 0,
        description: "Favour video attachments",
    },
};
exports.DEFAULT_FILTERS = {
    feedFilterSectionArgs: [],
    filterSections: {},
    numericFilterArgs: [],
    numericFilters: {},
};
// App level config that is not user configurable
exports.DEFAULT_CONFIG = {
    defaultLanguage: "en",
    defaultRecordsPerPage: 40,
    maxNumCachedToots: 5000,
    // Timeline toots
    enableIncrementalLoad: true,
    maxTimelineTootsToFetch: 2500,
    // enableIncrementalLoad: true,        // useful dev options for faster load
    // maxTimelineTootsToFetch: 400,      // useful dev options for faster load
    incrementalLoadDelayMS: 1000,
    maxTimelineHoursToFetch: 168,
    numTootsInFirstFetch: 80,
    reloadIfOlderThanMinutes: 10,
    // API stuff
    minRecordsForFeatureScoring: 400,
    maxFollowingAccountsToPull: 5000,
    reloadFeaturesEveryNthOpen: 9,
    numServersToCheck: 30,
    minServerMAU: 100,
    // Trending tags
    numDaysToCountTrendingTagData: 3,
    numTootsPerTrendingTag: 20,
    numTrendingTags: 20,
    numTrendingTagsPerServer: 20,
    numTrendingTagsToots: 100,
    // Trending toots
    numTrendingTootsPerServer: 30,
    // Non-mastodon servers and/or servers that don't make the MAU data available publicly
    noMauServers: [
        "fediverse.one",
        "flipboard.com",
        "threads.net",
    ],
};
// Build a new FeedFilterSettings object with DEFAULT_FILTERS as the base.
function buildNewFilterSettings() {
    const filters = JSON.parse(JSON.stringify(exports.DEFAULT_FILTERS));
    // Start with numeric & sources filters. Other PropertyFilters depend on what's in the toots.
    filters.filterSections[property_filter_1.PropertyName.SOURCE] = new property_filter_1.default({ title: property_filter_1.PropertyName.SOURCE });
    numeric_filter_1.FILTERABLE_SCORES.forEach(f => filters.numericFilters[f] = new numeric_filter_1.default({ title: f }));
    console.debug(`Built new FeedFilterSettings:`, filters);
    return filters;
}
exports.buildNewFilterSettings = buildNewFilterSettings;
;
// For building a FeedFilterSettings object from the serialized version. Mutates object.
function populateFiltersFromArgs(serializedFilterSettings) {
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
exports.populateFiltersFromArgs = populateFiltersFromArgs;
;
//# sourceMappingURL=config.js.map