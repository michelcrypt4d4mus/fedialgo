/*
 * Centralized location for non-user configurable settings.
 */
import { FEDIVERSE_KEYS, ScorerDict, StorageKey, WeightName } from "./types";
import { isDebugMode, isLoadTest, isQuickMode } from "./helpers/environment_helpers";
import { logAndThrowError, traceLog } from "./helpers/log_helpers";

// Importing this const from time_helpers.ts yielded undefined, maybe bc of circular dependency?
export const SECONDS_IN_MINUTE = 60;
export const MINUTES_IN_HOUR = 60;
export const SECONDS_IN_HOUR = SECONDS_IN_MINUTE * MINUTES_IN_HOUR;
export const SECONDS_IN_DAY = 24 * SECONDS_IN_HOUR;
export const SECONDS_IN_WEEK = 7 * SECONDS_IN_DAY;

// Locale
const DEFAULT_LOCALE = "en-CA";
const DEFAULT_LANGUAGE = DEFAULT_LOCALE.split("-")[0];
const DEFAULT_COUNTRY = DEFAULT_LOCALE.split("-")[1];
const LOCALE_REGEX = /^[a-z]{2}(-[A-Za-z]{2})?$/;

type StaleDataConfig = {[key in StorageKey]?: number};

type ApiRequestDefaults = {
    batchSize?: number;
    initialMaxRecords?: number;
    numMinutesUntilStale?: number;
    supportsMaxId?: boolean;
};


// See Config for comments explaining these values
export type ConfigType = {
    // Locale stuff
    country: string;
    defaultLanguage: string;
    language: string;
    locale: string;
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
    timelineDecayExponent: number;
    // Participated tags
    numParticipatedTagsToFetchTootsFor: number;
    numParticipatedTagToots: number;
    numParticipatedTagTootsPerTag: number;
    // API stuff
    backgroundLoadIntervalSeconds: number;
    batchCompleteTootsSize: number;
    batchCompleteTootsSleepBetweenMS: number;
    defaultRecordsPerPage: number;
    maxConcurrentRequestsBackground: number;
    maxConcurrentRequestsInitial: number;
    maxEndpointRecordsToPull: number;
    maxRecordsForFeatureScoring: number;
    minRecordsForFeatureScoring: number;
    mutexWarnSeconds: number;
    staleDataDefaultMinutes: number;
    staleDataTrendingMinutes: number;
    timeoutMS: number;
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
    // Scorers
    scorersConfig: ScorerDict;
};


// App level config that is not user configurable
export const Config: ConfigType = {
    // Locale stuff
    country: DEFAULT_COUNTRY,
    defaultLanguage: DEFAULT_LANGUAGE,
    language: DEFAULT_LANGUAGE,
    locale: DEFAULT_LOCALE,

    //////////////////////////////////////
    // Number of toots config variables //
    ///////////////////////////////////////
    maxCachedTimelineToots: 3_500,          // How many toots to keep in memory maximum. Larger cache doesn't seem to impact performance much
    numDesiredTimelineToots: 800,           // How many home timeline toots to start with
    // Participated tags
    numParticipatedTagsToFetchTootsFor: 30, // Pull toots for this many of the user's most participated tags
    numParticipatedTagToots: 200,           // How many total toots to include for the user's most participated tags
    numParticipatedTagTootsPerTag: 10,      // How many toots to pull for each participated tag
    // Trending tags
    numTootsPerTrendingTag: 15,             // How many toots to pull for each trending tag
    numTrendingTags: 20,                    // How many trending tags to use after ranking their popularity (seems like values over 19 lead to one stalled search?)
    numTrendingTagsToots: 200,              // Maximum number of toots with trending tags to push into the user's feed
    // Trending toots
    numTrendingTootsPerServer: 30,          // How many trending toots to pull per server

    // Timeline toots
    excessiveTags: 25,                      // Toots with more than this many tags will be penalized
    hashtagTootRetrievalDelaySeconds: 5,    // Delay before pulling trending & participated hashtag toots
    homeTimelineBatchSize: 80,              // How many toots to pull in the first fetch
    incrementalLoadDelayMS: 500,            // Delay between incremental loads of toots
    lookbackForUpdatesMinutes: 180,         // How long to look back for updates (edits, increased reblogs, etc.)
    maxTimelineDaysToFetch: 7,              // Maximum length of time to pull timeline toots for
    scoringBatchSize: 100,                  // How many toots to score at once
    staleDataDefaultMinutes: 10,            // Default how long to wait before considering data stale
    staleDataTrendingMinutes: 60,           // Default. is actually computed based on the FEDIVERSE_KEYS
    timelineDecayExponent: 1.2,             // Exponent for the time decay function (higher = more recent toots are favoured)

    // API stuff
    backgroundLoadIntervalSeconds: 10 * SECONDS_IN_MINUTE, // Background poll for user data after initial load
    defaultRecordsPerPage: 40,              // Max per page is usually 40: https://docs.joinmastodon.org/methods/timelines/#request-2
    // Right now this only applies to the initial load of toots for hashtags because those spawn a lot of parallel requests
    maxConcurrentRequestsInitial: 15,       // How many toot requests to make in parallel
    maxConcurrentRequestsBackground: 8,     // How many toot requests to make in parallel once the initial load is done
    maxEndpointRecordsToPull: 5_000,        // MAX_FOLLOWING_ACCOUNT_TO_PULL
    maxRecordsForFeatureScoring: 1_500,     // number of notifications, replies, etc. to pull slowly in background for scoring
    minRecordsForFeatureScoring: 320,       // number of notifications, replies, etc. to pull in initial load. KEY BOTTLENECK on RecentUserToots
    minServerMAU: 100,                      // Minimum MAU for a server to be considered for trending toots/tags
    mutexWarnSeconds: 5,                    // How long to wait before warning about a mutex lock
    numServersToCheck: 30,                  // NUM_SERVERS_TO_CHECK
    batchCompleteTootsSleepBetweenMS: 250,  // How long to wait between batches of Toot.completeToots() calls
    batchCompleteTootsSize: 25,             // How many toots call completeToot() on at once
    timeoutMS: 5_000,                       // Timeout for API calls

    // Trending tags and links
    excessiveTagsPenalty: 0.1,              // Multiplier to penalize toots with excessive tags
    invalidTrendingTags: [                  // Tags that are too generic to be considered trending
        "news",
        "photography",
    ],
    minTrendingTagTootsForPenalty: 9,       // Minimum number of toots with a trending tag before DiversityFeedScorer applies a penalty
    numDaysToCountTrendingTagData: 3,       // Look at this many days of user counts when assessing trending tags
    numTrendingLinksPerServer: 20,          // How many trending links to pull from each server
    numTrendingTagsPerServer: 20,           // How many trending tags to pull from each server (Mastodon default is 10)

    // Demo app GUI stuff
    isAppFilterVisible: false,              // 99% of toots don't have the app field set so don't show the filter section

    // Popular servers that are used as fallbacks if the user isn't following accounts on enough
    // servers to make for a good set of trending toots and hashtags.
    // Culled from https://mastodonservers.net and https://joinmastodon.org/ and https://fedidb.com/software/mastodon?registration=open
    defaultServers: [
        "mastodon.social",
        "mastodon.cloud",
        "mastodon.online",
        "mas.to",
        "mastodon.world",
        "loforo.com",
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
        "mastodon.ie",
        "mastodon.nz",
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
            "social.tchncs.de",
            "sueden.social",
            "mastodontech.de",
            "nerdculture.de",
        ],
        "es": [
            "tkz.one",
            "mast.lat",
            "mastorol.es",
        ],
        "eu": [  // Basque language
            "mastodon.eus",
        ],
        "fr": [
            "piaille.fr",
            "pouet.chapril.org",
            "mastoot.fr",
            "mamot.fr",
            "qlub.social", // Montreal
        ],
        "ja": [
            "mstdn.jp",
            "m.cmx.im",
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
        "tr": [
            "mastoturk.org",
        ],
        "zh-cn": [
            "m.cmx.im",
            "m.otter.homes",
            "mast.dragon-fly.club",
            "alive.bar",
            "g0v.social",
            "link.baai.ac.cn",
        ],
    },
    // Non-mastodon servers and/or servers that don't make the MAU data available publicly
    noMauServers: [
        "agora.echelon.pl",
        "amf.didiermary.fr",
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
        "toot.io",
    ],

    // Scorers
    scorersConfig: {
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
        [WeightName.FAVOURITED_TAGS]: {
            description: "Favour toots containing hashtags you favourite",
        },
        [WeightName.FOLLOWED_TAGS]: {
            description: "Favour toots containing hashtags you follow",
        },
        [WeightName.IMAGE_ATTACHMENTS]: {
            description: "Favour image attachments",
        },
        [WeightName.INTERACTIONS]: {
            description: "Favour accounts that interact with your toots",
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
    },
};


export function setLocale(locale?: string): void {
    locale ??= DEFAULT_LOCALE;

    if (!LOCALE_REGEX.test(locale)) {
        console.warn(`Invalid locale "${locale}", using default "${DEFAULT_LOCALE}"`);
        return;
    }

    Config.locale = locale;
    const [language, country] = locale.split("-");
    Config.country = country || DEFAULT_COUNTRY;

    if (language) {
        if (language == DEFAULT_LANGUAGE || language in Config.foreignLanguageServers) {
            Config.language = language;
        } else {
            console.warn(`Language "${language}" not supported, using default "${Config.defaultLanguage}"`);
        }
    }
};


// Debug mode settings
if (isQuickMode) {
    Config.backgroundLoadIntervalSeconds = SECONDS_IN_HOUR;
    Config.hashtagTootRetrievalDelaySeconds = 2;
    Config.incrementalLoadDelayMS = 100;
    Config.lookbackForUpdatesMinutes = 15;
    Config.maxRecordsForFeatureScoring = 480;
    Config.numDesiredTimelineToots = 400;
    Config.numParticipatedTagsToFetchTootsFor = 20;
    Config.numTrendingTags = 20;
}

if (isDebugMode) {
    Config.maxRecordsForFeatureScoring = 20_000;
};

// Heavy load test settings
if (isLoadTest) {
    Config.maxCachedTimelineToots = 5_000;
    Config.maxRecordsForFeatureScoring = 1_500;
    Config.numDesiredTimelineToots = 2_500;
    Config.numParticipatedTagsToFetchTootsFor = 50;
    Config.numParticipatedTagToots = 500;
    Config.numParticipatedTagTootsPerTag = 10;
    Config.numTrendingTags = 40;
    Config.numTrendingTagsToots = 1_000;
};


// Default params for usage with API requests
export const API_DEFAULTS: {[key in StorageKey]?: ApiRequestDefaults} = {
    [StorageKey.BLOCKED_ACCOUNTS]: {
        initialMaxRecords: Config.maxEndpointRecordsToPull,
        numMinutesUntilStale: 12 * MINUTES_IN_HOUR,
    },
    [StorageKey.FAVOURITED_TOOTS]: {
        initialMaxRecords: Config.minRecordsForFeatureScoring,
        numMinutesUntilStale: 12 * MINUTES_IN_HOUR,
    },
    [StorageKey.FEDIVERSE_POPULAR_SERVERS]: {
        numMinutesUntilStale: 24 * MINUTES_IN_HOUR,
    },
    [StorageKey.FEDIVERSE_TRENDING_LINKS]: {
        numMinutesUntilStale: 4 * MINUTES_IN_HOUR,
    },
    [StorageKey.FEDIVERSE_TRENDING_TAGS]: {
        numMinutesUntilStale: 4 * MINUTES_IN_HOUR,
    },
    [StorageKey.FEDIVERSE_TRENDING_TOOTS]: {
        numMinutesUntilStale: 4 * MINUTES_IN_HOUR,
    },
    [StorageKey.FOLLOWED_ACCOUNTS]: {
        batchSize: 80,
        initialMaxRecords: Config.maxEndpointRecordsToPull,
        numMinutesUntilStale: 4 * MINUTES_IN_HOUR,
    },
    [StorageKey.FOLLOWED_TAGS]: {
        batchSize: 100,
        initialMaxRecords: Config.maxEndpointRecordsToPull,
        numMinutesUntilStale: 4 * MINUTES_IN_HOUR,
    },
    [StorageKey.HOME_TIMELINE]: {
        initialMaxRecords: Config.numDesiredTimelineToots,
        supportsMaxId: true,
    },
    [StorageKey.MUTED_ACCOUNTS]: {
        initialMaxRecords: Config.maxEndpointRecordsToPull,
        numMinutesUntilStale: 12 * MINUTES_IN_HOUR,
    },
    [StorageKey.PARTICIPATED_TAG_TOOTS]: {
        numMinutesUntilStale: 15,
    },
    [StorageKey.RECENT_NOTIFICATIONS]: {
        batchSize: 80,
        initialMaxRecords: Config.minRecordsForFeatureScoring,
        numMinutesUntilStale: 6 * MINUTES_IN_HOUR,
        supportsMaxId: true,
    },
    [StorageKey.RECENT_USER_TOOTS]: {
        initialMaxRecords: Config.minRecordsForFeatureScoring,
        numMinutesUntilStale: 2 * MINUTES_IN_HOUR,
        supportsMaxId: true,
    },
    [StorageKey.SERVER_SIDE_FILTERS]: {
        initialMaxRecords: Config.maxEndpointRecordsToPull,
        numMinutesUntilStale: 24 * MINUTES_IN_HOUR,
    },
    [StorageKey.TRENDING_TAG_TOOTS]: {
        numMinutesUntilStale: 15,
    },
};


// Validate and set a few derived values in the config
function validateConfig(cfg: ConfigType | object): void {
    // Compute min value for FEDIVERSE_KEYS staleness and store on Config object
    const trendStalenesses = FEDIVERSE_KEYS.map(k => API_DEFAULTS[k as StorageKey]?.numMinutesUntilStale);
    Config.staleDataTrendingMinutes = Math.min(...trendStalenesses as number[]);

    // Check that all the values are valid
    Object.entries(cfg).forEach(([key, value]) => {
        if (typeof value === "object") {
            validateConfig(value);
        } else if (typeof value == "number" && isNaN(value)) {
            logAndThrowError(`Config value at ${key} is NaN`);
        }
    });
};

validateConfig(Config);
traceLog("[Config] validated config:", Config);
