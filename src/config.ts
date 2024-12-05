/*
 * Centralized location for non-user configurable settings.
 */
import { Config, FeedFilterSettings, ScorerInfo } from "./types";


export enum WeightName {
    CHAOS = 'Chaos',
    DIVERSITY = 'Diversity',
    FAVORITED_ACCOUNTS = 'FavoritedAccounts',
    FOLLOWED_TAGS = 'FollowedTags',
    IMAGE_ATTACHMENTS = 'ImageAttachments',
    INTERACTIONS = 'Interactions',
    MOST_REPLIED_ACCOUNTS = "MostRepliedAccounts",
    MOST_RETOOTED_ACCOUNTS = 'MostRetootedAccounts',
    NUM_FAVOURITES = 'NumFavourites',
    NUM_REPLIES = 'NumReplies',
    NUM_RETOOTS = 'NumRetoots',
    RETOOTED_IN_FEED = 'RetootedInFeed',
    TIME_DECAY = 'TimeDecay',
    TRENDING_TAGS = "TrendingTags",
    TRENDING_TOOTS = "TrendingToots",
    VIDEO_ATTACHMENTS = 'VideoAttachments',
};


type ScorerInfoDict = {
    [key in WeightName]: ScorerInfo;
};

export const DEFAULT_WEIGHTS: ScorerInfoDict = {
    [WeightName.CHAOS]: {
        defaultWeight: 1,
        description: "Insert Chaos into the scoring (social media ist krieg)",
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
    [WeightName.MOST_RETOOTED_ACCOUNTS]: {
        defaultWeight: 3,
        description: "Favour accounts you often retoot",
    },
    [WeightName.MOST_REPLIED_ACCOUNTS]: {
        defaultWeight: 1,
        description: "Favour accounts you often reply to",
    },
    [WeightName.TIME_DECAY]: {
        defaultWeight: 0.05,
        description: "Higher values favour recent toots more",
    },
    [WeightName.TRENDING_TOOTS]: {
        defaultWeight: 0.08,
        description: "Favour toots that are trending in the Fediverse",
    },
    [WeightName.TRENDING_TAGS]: {
        defaultWeight: 0.4,
        description: "Favour hashtags that are trending in the Fediverse",
    },
    [WeightName.VIDEO_ATTACHMENTS]: {
        defaultWeight: 0,
        description: "Favour video attachments",
    },
    [WeightName.DIVERSITY]: {
        defaultWeight: 1,
        description: "Disfavour toots from users that are filling up your feed with a lot of toots",
    },
    [WeightName.RETOOTED_IN_FEED]: {
        defaultWeight: 2,
        description: "Favour toots retooted by multiple accounts you follow",
    },
};


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


// App level config that is not user configurable
export const DEFAULT_CONFIG = {
    defaultLanguage: "en",
    defaultRecordsPerPage: 40,           // Max per page is usually 40: https://docs.joinmastodon.org/methods/timelines/#request-2
    // Timeline toots
    maxTimelineTootsToFetch: 480,        // How many standard timeline toots to pull
    maxTimelineHoursToFetch: 168,        // Maximum length of time to pull timeline toots for
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
    minTootsForTagToAppearInFilter: 5,   // Min # of toots w/a tag for a blacklist/whitelist filter option to exist
} as Config;
