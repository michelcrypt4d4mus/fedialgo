"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONFIG = exports.DEFAULT_FILTERS = exports.DEFAULT_WEIGHTS = void 0;
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
    numTootsInFirstFetch: 400,
    // enableIncrementalLoad: false,        // useful dev options for faster load
    // numTootsInFirstFetch: 240,           // useful dev options for faster load
    incrementalLoadDelayMS: 1000,
    maxTimelineHoursToFetch: 168,
    maxTimelineTootsToFetch: 3000,
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
        "threads.net",
    ],
};
//# sourceMappingURL=config.js.map