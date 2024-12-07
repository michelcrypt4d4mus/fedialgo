/*
 * Centralized location for non-user configurable settings.
 */
import PropertyFilter, { PropertyName } from "./objects/property_filter";
import NumericFilter from "./objects/numeric_filter";
import { Config, FeedFilterSettings, ScorerDict, WeightName } from "./types";


export const DEFAULT_WEIGHTS: ScorerDict = {
    [WeightName.CHAOS]: {
        defaultWeight: 1,
        description: "Insert Chaos into the scoring (social media ist krieg)",
    },
    [WeightName.DIVERSITY]: {
        defaultWeight: 1,
        description: "Disfavour accounts that are tooting a lot right now",
    },
    [WeightName.FAVORITED_ACCOUNTS]: {
        defaultWeight: 1,
        description: "Favour accounts you often favourite",
    },
    [WeightName.FOLLOWED_TAGS]: {
        defaultWeight: 2,
        description: "Favour toots that contain hashtags you are following",
    },
    [WeightName.IMAGE_ATTACHMENTS]: {
        defaultWeight: 0,
        description: "Favour image attachments",
    },
    [WeightName.INTERACTIONS]: {
        defaultWeight: 2,
        description: "Favour accounts that recently interacted with your toots",
    },
    [WeightName.MOST_REPLIED_ACCOUNTS]: {
        defaultWeight: 1,
        description: "Favour accounts you often reply to",
    },
    [WeightName.MOST_RETOOTED_ACCOUNTS]: {
        defaultWeight: 3,
        description: "Favour accounts you often retoot",
    },
    [WeightName.NUM_FAVOURITES]: {
        defaultWeight: 1,
        description: "Favour things favourited by users on your home server",
    },
    [WeightName.NUM_REPLIES]: {
        defaultWeight: 1,
        description: "Favour toots with lots of replies",
    },
    [WeightName.NUM_RETOOTS]: {
        defaultWeight: 1,
        description: "Favour toots that are retooted a lot",
    },
    [WeightName.RETOOTED_IN_FEED]: {
        defaultWeight: 2,
        description: "Favour toots retooted by multiple accounts you follow",
    },
    [WeightName.TIME_DECAY]: {
        defaultWeight: 0.05,
        description: "Higher values favour recent toots more",
        minValue: 0.001,
    },
    [WeightName.TRENDING_TAGS]: {
        defaultWeight: 0.4,
        description: "Favour hashtags that are trending in the Fediverse",
    },
    [WeightName.TRENDING_TOOTS]: {
        defaultWeight: 0.08,
        description: "Favour toots that are trending in the Fediverse",
    },
    [WeightName.VIDEO_ATTACHMENTS]: {
        defaultWeight: 0,
        description: "Favour video attachments",
    },
};


export const DEFAULT_FILTERS = {
    feedFilterSectionArgs: [],
    filterSections: {} as Record<PropertyName, PropertyFilter>,
    numericFilterArgs: [],
    numericFilters: {} as Record<WeightName, NumericFilter>,
} as FeedFilterSettings;


// App level config that is not user configurable
export const DEFAULT_CONFIG = {
    defaultLanguage: "en",
    defaultRecordsPerPage: 40,           // Max per page is usually 40: https://docs.joinmastodon.org/methods/timelines/#request-2
    maxNumCachedToots: 5_000,            // How many toots to keep in memory maximum

    // Timeline toots
    // enableIncrementalLoad: false,        // useful dev options for faster load
    // numTootsInFirstFetch: 240,           // useful dev options for faster load
    enableIncrementalLoad: true,         // Continue loading in background after initial load
    numTootsInFirstFetch: 400,           // How many toots to pull in the first fetch
    incrementalLoadDelayMS: 1000,        // Delay between incremental loads of toots
    maxTimelineHoursToFetch: 168,        // Maximum length of time to pull timeline toots for
    maxTimelineTootsToFetch: 3000,       // How many standard timeline toots to pull
    reloadIfOlderThanMinutes: 10,        // currently unused

    // API stuff
    minRecordsForFeatureScoring: 400,    // number of notifications, replies, etc. to pull
    maxFollowingAccountsToPull: 5_000,   // MAX_FOLLOWING_ACCOUNT_TO_PULL
    reloadFeaturesEveryNthOpen: 9,       // RELOAD_FEATURES_EVERY_NTH_OPEN
    numServersToCheck: 30,               // NUM_SERVERS_TO_CHECK
    minServerMAU: 100,                   // MINIMUM_MAU

    // Trending tags
    numDaysToCountTrendingTagData: 3,    // Look at this many days of user counts when assessing trending tags
    numTootsPerTrendingTag: 20,          // How many toots to pull for each trending tag
    numTrendingTags: 20,                 // How many trending tags to use after ranking their popularity
    numTrendingTagsPerServer: 20,        // How many trending tags to pull from each server (Mastodon default is 10)
    numTrendingTagsToots: 100,           // Maximum number of toots with trending tags to push into the user's feed
    // Trending toots
    numTrendingTootsPerServer: 30,       // How many trending toots to pull per server
    // Tag filters
    minTootsToAppearInFilter: 5,   // Min # of toots w/a tag for a blacklist/whitelist filter option to exist

    // MAU etc.
    noMauServers: [
        "fediverse.one",
        "threads.net",
    ],
} as Config;
