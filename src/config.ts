/*
 * Centralized location for non-user configurable settings.
 */
import { Config, FeedFilterSettings } from "./types";


export const DEFAULT_CONFIG = {
    defaultRecordsPerPage: 40,   // Max per page is usually 40: https://docs.joinmastodon.org/methods/timelines/#request-2
    maxTimelineTootsToFetch: 480,        // MAX_TIMELINE_TOOTS_TO_FETCH
    maxTimelineHoursToFetch: 96,
    reloadIfOlderThanMinutes: 10, // currently unused
    defaultLanguage: "en",

    // API stuff
    minRecordsForFeatureScoring: 400,    // number of notifications, replies, etc. to pull
    maxFollowingAccountsToPull: 5_000,   // MAX_FOLLOWING_ACCOUNT_TO_PULL
    reloadFeaturesEveryNthOpen: 9,       // RELOAD_FEATURES_EVERY_NTH_OPEN
    numServersToCheck: 30,               // NUM_SERVERS_TO_CHECK
    minServerMAU: 100,                   // MINIMUM_MAU

    // Trending tags
    numDaysToCountTrendingTagData: 3,    // const NUM_DAYS_TO_COUNT_TAG_DATA = 3;
    numTrendingTags: 20,                 // const NUM_TRENDING_TAGS = 20;
    numTrendingTagsPerServer: 20,        // const NUM_TRENDING_TAGS_PER_SERVER = 20;
    numTrendingTagsToots: 100,           // const NUM_TRENDING_TAG_TOOTS = 100;
    numTrendingTagsTootsPerServer: 20,   // const NUM_TRENDING_TAG_TOOTS_PER_SERVER = 20;

    // Tag filters
    minTootsForTagToAppearInFilter: 5,  // MINIMUM_TAGS_FOR_FILTER

    // Trending toots
    numTrendingTootsPerServer: 30,      // NUM_TRENDING_TOOTS_PER_SERVER
} as Config;


export const DEFAULT_FILTERS = {
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
} as FeedFilterSettings;

// TODO: maybe put default weights here too?
