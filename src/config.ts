/*
 * Centralized location for non-user configurable settings.
 */
import { isDebugMode, isLoadTest } from "./helpers/environment_helpers";
import { FEDIVERSE_KEYS, ScorerDict, StorageKey, WeightName } from "./types";

export const DEFAULT_LOCALE = "en-CA";
export const DEFAULT_LANGUAGE = DEFAULT_LOCALE.split("-")[0];
export const DEFAULT_COUNTRY = DEFAULT_LOCALE.split("-")[1];
// Importing this const from time_helpers.ts yielded undefined, maybe bc of circular dependency?
export const SECONDS_IN_MINUTE = 60;
export const SECONDS_IN_HOUR = SECONDS_IN_MINUTE * 60;


type StaleDataConfig = {
    [key in StorageKey]?: number
};

// See Config for comments explaining these values
export type ConfigType = {
    defaultLanguage: string;
    language: string;
    // Timeline
    excessiveTags: number;
    hashtagTootRetrievalDelaySeconds: number;
    homeTimelineBatchSize: number;
    incrementalLoadDelayMS: number;
    lookbackForUpdatesMinutes: number;
    maxCachedTimelineToots: number;
    maxTimelineDaysToFetch: number;
    numDesiredTimelineToots: number;
    scoringBatchSize: number;
    staleDataDefaultSeconds: number;
    timelineDecayExponent: number;
    // Participated tags
    numParticipatedTagsToFetchTootsFor: number;
    numParticipatedTagToots: number;
    numParticipatedTagTootsPerTag: number;
    // API stuff
    backgroundLoadIntervalSeconds: number;
    defaultRecordsPerPage: number;
    maxConcurrentRequestsBackground: number;
    maxConcurrentRequestsInitial: number;
    maxFollowingAccountsToPull: number;
    maxRecordsForFeatureScoring: number;
    minRecordsForFeatureScoring: number;
    mutexWarnSeconds: number;
    reloadFeaturesEveryNthOpen: number;
    sleepBetweenCompletionMS: number;
    staleDataSeconds: StaleDataConfig;
    timeoutMS: number;
    staleDataTrendingSeconds: number;
    // Fedivere server scraping
    minServerMAU: number;
    numServersToCheck: number;
    // Trending tags
    excessiveTagsPenalty: number;
    invalidTrendingTags: string[];
    minTrendingTagTootsForPenalty: number,
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
    // Demo app GUI stuff
    isAppFilterVisible: boolean;
};


// App level config that is not user configurable
export const Config: ConfigType = {
    defaultLanguage: DEFAULT_LANGUAGE,
    language: DEFAULT_LANGUAGE,

    // Timeline toots
    excessiveTags: 25,                      // Toots with more than this many tags will be penalized
    hashtagTootRetrievalDelaySeconds: 5,    // Delay before pulling trending & participated hashtag toots
    homeTimelineBatchSize: 80,              // How many toots to pull in the first fetch
    incrementalLoadDelayMS: 500,            // Delay between incremental loads of toots
    lookbackForUpdatesMinutes: 180,         // How long to look back for updates (edits, increased reblogs, etc.)
    maxCachedTimelineToots: 1600,           // How many toots to keep in memory maximum
    maxTimelineDaysToFetch: 7,              // Maximum length of time to pull timeline toots for
    numDesiredTimelineToots: 700,           // How many home timeline toots to start with
    scoringBatchSize: 100,                  // How many toots to score at once
    staleDataDefaultSeconds: 10 * 60,       // Default how long to wait before considering data stale
    staleDataTrendingSeconds: SECONDS_IN_HOUR, // Default. is actually computed based on the FEDIVERSE_KEYS
    staleDataSeconds: {                     // Dictionary to configure customized timeouts for different kinds of data
        [StorageKey.BLOCKED_ACCOUNTS]:          12 * SECONDS_IN_HOUR,
        [StorageKey.FAVOURITED_TOOTS]:          12 * SECONDS_IN_HOUR,
        [StorageKey.FEDIVERSE_POPULAR_SERVERS]: 24 * SECONDS_IN_HOUR,
        [StorageKey.FEDIVERSE_TRENDING_LINKS]:   4 * SECONDS_IN_HOUR,
        [StorageKey.FEDIVERSE_TRENDING_TAGS]:    4 * SECONDS_IN_HOUR,
        [StorageKey.FEDIVERSE_TRENDING_TOOTS]:   4 * SECONDS_IN_HOUR,
        [StorageKey.FOLLOWED_ACCOUNTS]:          4 * SECONDS_IN_HOUR,
        [StorageKey.FOLLOWED_TAGS]:              4 * SECONDS_IN_HOUR,
        [StorageKey.MUTED_ACCOUNTS]:            12 * SECONDS_IN_HOUR,
        [StorageKey.PARTICIPATED_TAG_TOOTS]:    15 * SECONDS_IN_MINUTE,
        [StorageKey.RECENT_NOTIFICATIONS]:       6 * SECONDS_IN_HOUR,
        [StorageKey.RECENT_USER_TOOTS]:          2 * SECONDS_IN_HOUR,
        [StorageKey.SERVER_SIDE_FILTERS]:       24 * SECONDS_IN_HOUR,
        [StorageKey.TRENDING_TAG_TOOTS]:        15 * SECONDS_IN_MINUTE,
    },
    timelineDecayExponent: 1.2,             // Exponent for the time decay function (higher = more recent toots are favoured)

    // Participated tags
    numParticipatedTagsToFetchTootsFor: 30, // Pull toots for this many of the user's most participated tags
    numParticipatedTagToots: 150,           // How many total toots to include for the user's most participated tags
    numParticipatedTagTootsPerTag: 5,       // How many toots to pull for each participated tag

    // API stuff
    backgroundLoadIntervalSeconds: 10 * SECONDS_IN_MINUTE, // Background poll for user data after initial load
    defaultRecordsPerPage: 40,              // Max per page is usually 40: https://docs.joinmastodon.org/methods/timelines/#request-2
    // Right now this only applies to the initial load of toots for hashtags because those spawn a lot of parallel requests
    maxConcurrentRequestsInitial: 15,       // How many toot requests to make in parallel
    maxConcurrentRequestsBackground: 3,     // How many toot requests to make in parallel once the initial load is done
    maxFollowingAccountsToPull: 5_000,      // MAX_FOLLOWING_ACCOUNT_TO_PULL
    maxRecordsForFeatureScoring: 1_500,     // number of notifications, replies, etc. to pull slowly in background for scoring
    minRecordsForFeatureScoring: 240,       // number of notifications, replies, etc. to pull in initial load
    minServerMAU: 100,                      // Minimum MAU for a server to be considered for trending toots/tags
    mutexWarnSeconds: 5,                    // How long to wait before warning about a mutex lock
    numServersToCheck: 30,                  // NUM_SERVERS_TO_CHECK
    reloadFeaturesEveryNthOpen: 9,          // RELOAD_FEATURES_EVERY_NTH_OPEN
    sleepBetweenCompletionMS: 200,          // How long to wait between batches of Toot.completeToots() calls
    timeoutMS: 5_000,                       // Timeout for API calls

    // Trending tags and links
    excessiveTagsPenalty: 0.1,              // Multiplier to penalize toots with excessive tags
    invalidTrendingTags: [                  // Tags that are too generic to be considered trending
        "news",
        "photography",
    ],
    minTrendingTagTootsForPenalty: 9,       // Minimum number of toots with a trending tag before DiversityFeedScorer applies a penalty
    numDaysToCountTrendingTagData: 3,       // Look at this many days of user counts when assessing trending tags
    numTootsPerTrendingTag: 15,             // How many toots to pull for each trending tag
    numTrendingLinksPerServer: 20,          // How many trending links to pull from each server
    numTrendingTags: 20,                    // How many trending tags to use after ranking their popularity (seems like values over 19 lead to one stalled search?)
    numTrendingTagsPerServer: 30,           // How many trending tags to pull from each server (Mastodon default is 10)
    numTrendingTagsToots: 200,              // Maximum number of toots with trending tags to push into the user's feed
    // Trending toots
    numTrendingTootsPerServer: 30,          // How many trending toots to pull per server

    // Demo app GUI stuff
    isAppFilterVisible: false,              // 99% of toots don't have the app field set so don't show the filter section

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
        "techhub.social",
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
        "mastodon.art",
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
        "med-mastodon.com",
    ],
};

// Debug mode settings
if (isDebugMode) {
    Config.backgroundLoadIntervalSeconds = 120;
    Config.hashtagTootRetrievalDelaySeconds = 2;
    Config.incrementalLoadDelayMS = 100;
    Config.maxCachedTimelineToots = 700;
    Config.maxRecordsForFeatureScoring = 480;
    Config.numDesiredTimelineToots = 500;
    Config.numParticipatedTagsToFetchTootsFor = 10;
    Config.numTrendingTags = 5;
}

if (isLoadTest) {
    Config.maxCachedTimelineToots = 5000;
    Config.maxRecordsForFeatureScoring = 1500;
    Config.numDesiredTimelineToots = 2500;
    Config.numParticipatedTagsToFetchTootsFor = 50;
    Config.numParticipatedTagToots = 500;
    Config.numParticipatedTagTootsPerTag = 10;
    Config.numTrendingTags = 40;
    Config.numTrendingTagsToots = 1000;
}


// Compute min value for FEDIVERSE_KEYS staleness and store on Config object
const trendStaleness = FEDIVERSE_KEYS.map(k => Config.staleDataSeconds[k as StorageKey]);
Config.staleDataTrendingSeconds = Math.min(...trendStaleness as number[]);
if (!Config.staleDataTrendingSeconds) throw new Error("Config.staleDataTrendingMin is NaN");


function validateConfig(cfg: ConfigType | object): void {
    // Check that all the values are valid
    Object.entries(cfg).forEach(([key, value]) => {
        if (typeof value === "object") {
            validateConfig(value);
        } else if (typeof value == "number" && isNaN(value)) {
            const msg = `Config value at ${key} is NaN`;
            console.error(msg);
            throw new Error(msg);
        }
    });
};

console.debug(`[Config] Validating config:`, Config);
validateConfig(Config);


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
    // If this value is 2 then square root scores, if it's 3 then cube root scores, etc.
    [WeightName.OUTLIER_DAMPENER]: {
        description: "Dampens the effect of outliers scores",
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
    [WeightName.PARTICIPATED_TAGS]: {
        description: "Favour hastags you've tooted about",
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
