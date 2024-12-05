"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONFIG = exports.DEFAULT_FILTERS = exports.DEFAULT_WEIGHTS = void 0;
/*
 * Centralized location for non-user configurable settings.
 */
const types_1 = require("./types");
exports.DEFAULT_WEIGHTS = {
    [types_1.WeightName.CHAOS]: {
        defaultWeight: 1,
        description: "Insert Chaos into the scoring (social media ist krieg)",
    },
    [types_1.WeightName.DIVERSITY]: {
        defaultWeight: 1,
        description: "Disfavour toots from users that are filling up your feed with a lot of toots",
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
    [types_1.WeightName.MOST_REPLIED_ACCOUNTS]: {
        defaultWeight: 1,
        description: "Favour accounts you often reply to",
    },
    [types_1.WeightName.MOST_RETOOTED_ACCOUNTS]: {
        defaultWeight: 3,
        description: "Favour accounts you often retoot",
    },
    [types_1.WeightName.RETOOTED_IN_FEED]: {
        defaultWeight: 2,
        description: "Favour toots retooted by multiple accounts you follow",
    },
    [types_1.WeightName.TIME_DECAY]: {
        defaultWeight: 0.05,
        description: "Higher values favour recent toots more",
        minValue: 0.001,
        stepSize: 0.001,
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
    filteredApps: [],
    filteredLanguages: [],
    filteredTags: [],
    includeFollowedAccounts: true,
    includeFollowedHashtags: true,
    includeReplies: true,
    includeReposts: true,
    includeTrendingHashTags: true,
    includeTrendingToots: true,
    onlyLinks: false,
    suppressSelectedTags: false,
    weightLearningEnabled: false,
};
// App level config that is not user configurable
exports.DEFAULT_CONFIG = {
    defaultLanguage: "en",
    defaultRecordsPerPage: 40,
    // Timeline toots
    maxTimelineTootsToFetch: 600,
    maxTimelineHoursToFetch: 168,
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
    // Tag filters
    minTootsForTagToAppearInFilter: 5, // Min # of toots w/a tag for a blacklist/whitelist filter option to exist
};
//# sourceMappingURL=config.js.map