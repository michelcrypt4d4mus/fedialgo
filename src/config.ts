/*
 * Centralized location for non-user configurable settings.
 */
import { ScorerDict, StorageKey, WeightName } from "./types";
import { SECONDS_IN_HOUR, SECONDS_IN_MINUTE } from "./helpers/time_helpers";


type StaleDataConfig = {
    [key in StorageKey]?: number
}

// See DEFAULT_CONFIG for comments explaining these values
export type Config = {
    defaultLanguage: string;
    defaultRecordsPerPage: number;
    maxNumCachedToots: number;
    // Timeline
    enableIncrementalLoad: boolean;
    incrementalLoadDelayMS: number;
    maxTimelineHoursToFetch: number;
    maxTimelineTootsToFetch: number;
    numTootsInFirstFetch: number;
    scoringBatchSize: number;
    staleDataDefaultSeconds: number;
    timelineDecayExponent: number;
    // API stuff
    minRecordsForFeatureScoring: number;
    maxFollowingAccountsToPull: number;
    reloadFeaturesEveryNthOpen: number;
    numServersToCheck: number;
    minServerMAU: number;
    staleDataSeconds: StaleDataConfig;
    timeoutMS: number;
    // Trending tags
    excessiveTags: number;
    excessiveTagsPenalty: number;
    numTootsPerTrendingTag: number;
    numDaysToCountTrendingTagData: number;
    numTrendingLinksPerServer: number;
    numTrendingTags: number;
    numTrendingTagsPerServer: number;
    numTrendingTagsToots: number;
    // Trending toots
    numTrendingTootsPerServer: number;
    // MAU and other server properties
    defaultServers: string[];
    foreignLanguageServers: Record<string, string[]>;
    noMauServers: string[];
    noTrendingLinksServers: string[];
};


// App level config that is not user configurable
export const DEFAULT_CONFIG: Config = {
    defaultLanguage: "en",
    defaultRecordsPerPage: 40,           // Max per page is usually 40: https://docs.joinmastodon.org/methods/timelines/#request-2
    maxNumCachedToots: 2500,            // How many toots to keep in memory maximum

    // Timeline toots
    enableIncrementalLoad: true,         // Continue loading in background after initial load
    // incrementalLoadDelayMS: 500,         // Delay between incremental loads of toots
    // maxTimelineTootsToFetch: 2_500,      // How many standard timeline toots to pull
    incrementalLoadDelayMS: 1000,        // Delay between incremental loads of toots
    maxTimelineTootsToFetch: 900,        // useful dev options for faster load
    maxTimelineHoursToFetch: 168,        // Maximum length of time to pull timeline toots for
    numTootsInFirstFetch: 80,            // How many toots to pull in the first fetch
    scoringBatchSize: 100,               // How many toots to score at once
    staleDataDefaultSeconds: 10 * 60,    // Default how long to wait before considering data stale
    staleDataSeconds: {                  // Dictionary to configure customized timeouts for different kinds of data
        [StorageKey.BLOCKED_ACCOUNTS]:        12 * SECONDS_IN_HOUR,  // This value also covers the getUserData() call
        [StorageKey.FAVOURITED_ACCOUNTS]:     12 * SECONDS_IN_HOUR,
        [StorageKey.FEDIVERSE_TRENDING_TAGS]:  4 * SECONDS_IN_HOUR,
        [StorageKey.FEDIVERSE_TRENDING_LINKS]: 4 * SECONDS_IN_HOUR,
        [StorageKey.FEDIVERSE_TRENDING_TOOTS]: 4 * SECONDS_IN_HOUR,
        [StorageKey.FOLLOWED_ACCOUNTS]:        4 * SECONDS_IN_HOUR,
        [StorageKey.FOLLOWED_TAGS]:            4 * SECONDS_IN_HOUR,
        [StorageKey.RECENT_NOTIFICATIONS]:     6 * SECONDS_IN_HOUR,
        [StorageKey.RECENT_USER_TOOTS]:        2 * SECONDS_IN_HOUR,
        [StorageKey.POPULAR_SERVERS]:         24 * SECONDS_IN_HOUR,
        [StorageKey.SERVER_SIDE_FILTERS]:     24 * SECONDS_IN_HOUR,
        [StorageKey.TRENDING_TAG_TOOTS]:    0.25 * SECONDS_IN_HOUR,
    },
    timelineDecayExponent: 1.2,          // Exponent for the time decay function (higher = more recent toots are favoured)

    // API stuff
    maxFollowingAccountsToPull: 5_000,   // MAX_FOLLOWING_ACCOUNT_TO_PULL
    minRecordsForFeatureScoring: 400,    // number of notifications, replies, etc. to pull
    minServerMAU: 100,                   // Minimum MAU for a server to be considered for trending toots/tags
    numServersToCheck: 30,               // NUM_SERVERS_TO_CHECK
    reloadFeaturesEveryNthOpen: 9,       // RELOAD_FEATURES_EVERY_NTH_OPEN
    timeoutMS: 5_000,                    // Timeout for API calls

    // Trending tags
    excessiveTags: 25,                   // Toots with more than this many tags will be penalized
    excessiveTagsPenalty: 0.1,           // Multiplier to penalize toots with excessive tags
    numDaysToCountTrendingTagData: 3,    // Look at this many days of user counts when assessing trending tags
    numTootsPerTrendingTag: 20,          // How many toots to pull for each trending tag
    numTrendingLinksPerServer: 20,       // How many trending links to pull from each server
    numTrendingTags: 18,                 // How many trending tags to use after ranking their popularity (seems like values over 19 lead to one stalled search?)
    numTrendingTagsPerServer: 30,        // How many trending tags to pull from each server (Mastodon default is 10)
    numTrendingTagsToots: 150,           // Maximum number of toots with trending tags to push into the user's feed
    // Trending toots
    numTrendingTootsPerServer: 30,       // How many trending toots to pull per server

    // Popular servers that are used as fallbacks if the user isn't following accounts on enough
    // servers to make for a good set of trending toots and hashtags.
    // Culled from https://mastodonservers.net and https://joinmastodon.org/
    defaultServers: [
        "mastodon.social",
        "mastodon.cloud",
        "mastodon.online",
        "mas.to",
        "mastodon.world",
        "c.im",
        "hachyderm.io",
        "infosec.exchange",
        "universeodon.com",
        "kolektiva.social",
        "mastodon.gamedev.place",
        "mastodonapp.uk",
        "ioc.exchange",
        "tech.lgbt",
        "mastodon.art",
        "techhub.social",
        "mastodon.sdf.org",
        "indieweb.social",
        "mastodon.green",
        "defcon.social",
        "mstdn.party",
        "sfba.social",
        "toot.community",
        "ravenation.club",
        "metalhead.club",
        "sciences.social",
        "toot.io",
        // Servers that are no bueno for various reasons
        // "baraag.net",                 // very NSFW (anime porn)
        // "mstdn.social",               // Slow, blocked by CORS
        // "mastodon.lol",               // Doesn't return MAU data
        // "fosstodon.org",              // Doesn't support trending links/toots
        // "mastodon.technology",        // Doesn't return MAU data
        // "mathstodon.xyz",             // Doesn't return MAU data
    ],
    // Currently unused. Theoretically for non english users we would prefer these servers
    foreignLanguageServers: {
        "de": [
            "troet.cafe",
            "nrw.social",
            "hessen.social",
            "ruhr.social",
            "muenchen.social",
            "social.cologne",
        ],
        "es": [
            "tkz.one",
            "mast.lat",
            "mastorol.es",
        ],
        "fr": [
            "piaille.fr",
            "pouet.chapril.org",
            "mastoot.fr",
        ],
        "ja": [
            "mstdn.jp",
            "mastodon-japan.net",
            "famichiki.jp",
            // "pawoo.net",                  // (Maybe NSFW?)
        ],
        "pt": [
            "masto.pt",
        ],
        "it": [
            "mastodon.uno",
            "mastodon.bida.im",
            "sociale.network",
        ],
        "ru": [
            "pravda.me",
        ],
        "zh-cn": [
            "m.cmx.im",
            "m.otter.homes",
            "mast.dragon-fly.club",
        ],
    },
    // Non-mastodon servers and/or servers that don't make the MAU data available publicly
    noMauServers: [
        "agora.echelon.pl",
        "bsky.brid.gy",
        "fediverse.one",
        "flipboard.com",
        "mastodon.sdf.org",
        'mathstodon.xyz',
        "mstdn.social",    // blocked by CORS
        "threads.net",
    ],
    // Servers that don't support trending links
    noTrendingLinksServers: [
        "chaos.social",
        "fediscience.org",
        "mastodon.cloud",
        "mastodon.gamedev.place",
        "mastodon.sdf.org",
        "med-mastodon.com",
    ],
};


export const SCORERS_CONFIG: ScorerDict = {
    // Global modifiers that affect all weighted scores
    [WeightName.TIME_DECAY]: {
        description: "Higher values favour recent toots more",
        minValue: 0.001,
    },
    // Trending toots usually have a lot of reblogs, likes, replies, etc. so they get disproportionately
    // high scores. To adjust for this we use a final adjustment to the score by multiplying by the
    // TRENDING weighting value.
    [WeightName.TRENDING]: {
        description: "Multiplier applied to trending toots, tags, and links",
        minValue: 0.001,
    },

    // Weighted scores
    [WeightName.CHAOS]: {
        description: "Insert Chaos into the scoring (social media ist krieg)",
    },
    [WeightName.DIVERSITY]: {
        description: "Disfavour accounts that are tooting a lot right now",
    },
    [WeightName.FAVOURITED_ACCOUNTS]: {
        description: "Favour accounts you often favourite",
    },
    [WeightName.FOLLOWED_TAGS]: {
        description: "Favour toots that contain hashtags you are following",
    },
    [WeightName.IMAGE_ATTACHMENTS]: {
        description: "Favour image attachments",
    },
    [WeightName.INTERACTIONS]: {
        description: "Favour accounts that recently interacted with your toots",
    },
    [WeightName.MENTIONS_FOLLOWED]: {
        description: "Favour toots that mention accounts you follow",
    },
    [WeightName.MOST_REPLIED_ACCOUNTS]: {
        description: "Favour accounts you often reply to",
    },
    [WeightName.MOST_RETOOTED_ACCOUNTS]: {
        description: "Favour accounts you often retoot",
    },
    [WeightName.NUM_FAVOURITES]: {
        description: "Favour things favourited by your server's users",
    },
    [WeightName.NUM_REPLIES]: {
        description: "Favour toots with lots of replies",
    },
    [WeightName.NUM_RETOOTS]: {
        description: "Favour toots that are retooted a lot",
    },
    [WeightName.RETOOTED_IN_FEED]: {
        description: "Favour toots retooted by accounts you follow",
    },
    [WeightName.TRENDING_LINKS]: {
        description: "Favour links that are trending in the Fediverse",
    },
    [WeightName.TRENDING_TAGS]: {
        description: "Favour hashtags that are trending in the Fediverse",
    },
    [WeightName.TRENDING_TOOTS]: {
        description: "Favour toots that are trending in the Fediverse",
    },
    [WeightName.VIDEO_ATTACHMENTS]: {
        description: "Favour video attachments",
    },
};
