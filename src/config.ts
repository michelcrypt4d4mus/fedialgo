/*
 * Centralized location for non-user configurable settings.
 */
import { FEDIVERSE_KEYS, StorageKey, WeightInfoDict, WeightName } from "./types";
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

// number of notifications, replies, etc. to pull in initial load. KEY BOTTLENECK on RecentUserToots
export const MIN_RECORDS_FOR_FEATURE_SCORING = 320;
export const MAX_ENDPOINT_RECORDS_TO_PULL = 5_000;

type ApiRequestDefaults = {
    initialMaxRecords?: number;         // How many records to pull in the initial bootstrap
    limit?: number;                     // Max per page is usually 40
    lookbackForUpdatesMinutes?: number; // How long to look back for updates (edits, increased reblogs, etc.)
    numMinutesUntilStale?: number;      // How long until the data is considered stale
    supportsMinMaxId?: boolean;         // True if the endpoint supports min/maxId
};

type ApiConfigBase = {
    [key in StorageKey]?: ApiRequestDefaults;
};

interface ApiConfig extends ApiConfigBase {
    backgroundLoadIntervalSeconds: number;
    defaultRecordsPerPage: number;
    hashtagTootRetrievalDelaySeconds: number;
    maxConcurrentRequestsBackground: number;
    maxConcurrentRequestsInitial: number;
    maxRecordsForFeatureScoring: number;
    mutexWarnSeconds: number;
    staleDataDefaultMinutes: number;
    staleDataTrendingMinutes: number;
    timeoutMS: number;
};

type FediverseConfig = {
    defaultServers: string[];
    foreignLanguageServers: Record<string, string[]>;
    minServerMAU: number;
    noMauServers: string[];
    noTrendingLinksServers: string[];
    numServersToCheck: number;
};

type GuiConfig = {
    isAppFilterVisible: boolean; // 99% of toots don't have the app field set so don't show the filter section
};

type LocaleConfig = {
    country: string;
    defaultLanguage: string;
    language: string;
    locale: string;
};

type ScoringConfig = {
    excessiveTags: number;
    excessiveTagsPenalty: number;
    minTrendingTagTootsForPenalty: number,
    scoringBatchSize: number;
    timelineDecayExponent: number;
    weightsConfig: WeightInfoDict;
};

interface TagTootsConfig {
    maxToots: number;
    numTags: number;
    numTootsPerTag: number;
};

type TootsConfig = {
    batchCompleteTootsSleepBetweenMS: number,  // How long to wait between batches of Toot.completeToots() calls
    batchCompleteTootsSize: number,             // How many toots call completeToot() on at once
    maxAgeInDays: number;
    maxCachedTimelineToots: number,          // How many toots to keep in memory maximum. Larger cache doesn't seem to impact performance much
    tootsCompleteAfterMinutes: number;
};

type TrendingLinksConfig = {
    numTrendingLinksPerServer: number;
};

interface TrendingTagsConfig extends TagTootsConfig {
    invalidTrendingTags: string[]        // Tags that are too generic to be considered trending
    numDaysToCountTrendingTagData: number,    // Look at this many days of user counts when assessing trending tags
    numTagsPerServer: number,        // How many trending tags to pull from each server (Mastodon default is 10)
};

type TrendingTootsConfig = {
    numTrendingTootsPerServer: number;
};

type TrendingConfig = {
    links: TrendingLinksConfig;
    tags: TrendingTagsConfig;
    toots: TrendingTootsConfig;
};


// See Config for comments explaining these values
export type ConfigType = {
    api: ApiConfig;
    fediverse: FediverseConfig;
    gui: GuiConfig;
    locale: LocaleConfig;
    participatedTags: TagTootsConfig;
    scoring: ScoringConfig;
    toots: TootsConfig;
    trending: TrendingConfig;
};


// App level config that is not user configurable
export const Config: ConfigType = {
    api: {
        [StorageKey.BLOCKED_ACCOUNTS]: {
            initialMaxRecords: MAX_ENDPOINT_RECORDS_TO_PULL,
            numMinutesUntilStale: 12 * MINUTES_IN_HOUR,
        },
        [StorageKey.FAVOURITED_TOOTS]: {
            initialMaxRecords: MIN_RECORDS_FOR_FEATURE_SCORING,
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
            initialMaxRecords: MAX_ENDPOINT_RECORDS_TO_PULL,
            limit: 80,
            numMinutesUntilStale: 4 * MINUTES_IN_HOUR,
        },
        [StorageKey.FOLLOWED_TAGS]: {
            initialMaxRecords: MAX_ENDPOINT_RECORDS_TO_PULL,
            limit: 100,
            numMinutesUntilStale: 4 * MINUTES_IN_HOUR,
        },
        [StorageKey.HOME_TIMELINE]: {
            initialMaxRecords: 800,
            lookbackForUpdatesMinutes: 180,         // How long to look back for updates (edits, increased reblogs, etc.)
            supportsMinMaxId: true,
        },
        [StorageKey.MUTED_ACCOUNTS]: {
            initialMaxRecords: MAX_ENDPOINT_RECORDS_TO_PULL,
            numMinutesUntilStale: 12 * MINUTES_IN_HOUR,
        },
        [StorageKey.PARTICIPATED_TAG_TOOTS]: {
            numMinutesUntilStale: 15,
        },
        [StorageKey.NOTIFICATIONS]: {
            initialMaxRecords: MIN_RECORDS_FOR_FEATURE_SCORING,
            limit: 80,
            numMinutesUntilStale: 6 * MINUTES_IN_HOUR,
            supportsMinMaxId: true,
        },
        [StorageKey.RECENT_USER_TOOTS]: {
            initialMaxRecords: MIN_RECORDS_FOR_FEATURE_SCORING,
            numMinutesUntilStale: 2 * MINUTES_IN_HOUR,
            supportsMinMaxId: true,
        },
        [StorageKey.SERVER_SIDE_FILTERS]: {
            initialMaxRecords: MAX_ENDPOINT_RECORDS_TO_PULL,
            numMinutesUntilStale: 24 * MINUTES_IN_HOUR,
        },
        [StorageKey.TRENDING_TAG_TOOTS]: {
            numMinutesUntilStale: 15,
        },
        backgroundLoadIntervalSeconds: 10 * SECONDS_IN_MINUTE, // Background poll for user data after initial load
        defaultRecordsPerPage: 40,            // Max per page is usually 40: https://docs.joinmastodon.org/methods/timelines/#request-2
        hashtagTootRetrievalDelaySeconds: 3,  // Delay before pulling trending & participated hashtag toots
        // Right now this only applies to the initial load of toots for hashtags because those spawn a lot of parallel requests
        maxConcurrentRequestsInitial: 15,     // How many toot requests to make in parallel
        maxConcurrentRequestsBackground: 8,   // How many toot requests to make in parallel once the initial load is done
        maxRecordsForFeatureScoring: 1_500,   // number of notifications, replies, etc. to pull slowly in background for scoring
        mutexWarnSeconds: 5,                  // How long to wait before warning about a mutex lock
        staleDataDefaultMinutes: 10,          // Default how long to wait before considering data stale
        staleDataTrendingMinutes: 60,         // Default. but is later computed based on the FEDIVERSE_KEYS
        timeoutMS: 5_000,                     // Timeout for API calls
    },
    fediverse: {
        minServerMAU: 100,                      // Minimum MAU for a server to be considered for trending toots/tags
        numServersToCheck: 30,                  // NUM_SERVERS_TO_CHECK
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
            "mastodon.gamedev.place",
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
            "med-mastodon.com",
            "toot.io",
        ],
    },
    gui: {
        isAppFilterVisible: false,         // 99% of toots don't have the app field set so don't show the filter section
    },
    locale: {
        country: DEFAULT_COUNTRY,
        defaultLanguage: DEFAULT_LANGUAGE,
        language: DEFAULT_LANGUAGE,
        locale: DEFAULT_LOCALE,
    },
    participatedTags: {
        maxToots: 200,           // How many total toots to include for the user's most participated tags
        numTags: 30,             // Pull toots for this many of the user's most participated tags
        numTootsPerTag: 10,      // How many toots to pull for each participated tag
    },
    scoring: {
        excessiveTags: 25,                      // Toots with more than this many tags will be penalized
        excessiveTagsPenalty: 0.1,              // Multiplier to penalize toots with excessive tags
        minTrendingTagTootsForPenalty: 9,       // Minimum number of toots with a trending tag before DiversityFeedScorer applies a penalty
        scoringBatchSize: 100,                  // How many toots to score at once
        timelineDecayExponent: 1.2,             // Exponent for the time decay function (higher = more recent toots are favoured)
        weightsConfig: {
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
                description: "Dampens the effect of outlier scores",
                minValue: 0.001,
            },

            // Weighted scores
            [WeightName.ALREADY_SHOWN]: {
                description: 'Disfavour toots that have been marked as already seen'
            },
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
    },
    toots: {
        batchCompleteTootsSleepBetweenMS: 250,  // How long to wait between batches of Toot.completeToots() calls
        batchCompleteTootsSize: 25,             // How many toots call completeToot() on at once
        maxAgeInDays: 7,                        // How long to keep toots in the cache before removing them
        maxCachedTimelineToots: 3_000,          // How many toots to keep in memory maximum. Larger cache doesn't seem to impact performance much
        tootsCompleteAfterMinutes: 24 * MINUTES_IN_HOUR, // Toots younger than this will periodically have their derived fields reevaluated by Toot.completeToot()
    },
    trending: {
        links: {
            numTrendingLinksPerServer: 20,      // How many trending links to pull from each server
        },
        tags: {
            invalidTrendingTags: [              // Tags that are too generic to be considered trending
                "news",
                "photography",
            ],
            maxToots: 200,                      // Max number of toots with trending tags to push into the user's feed
            numDaysToCountTrendingTagData: 3,   // Look at this many days of user counts when assessing trending tags
            numTootsPerTag: 15,                 // How many toots to pull for each trending tag
            numTagsPerServer: 20,               // How many trending tags to pull from each server (Mastodon default is 10)
            numTags: 20,                        // How many trending tags to use after ranking their popularity (seems like values over 19 lead to one stalled search?)
        },
        toots: {
            numTrendingTootsPerServer: 30,      // How many trending toots to pull per server // TODO: unused?
        },
    },
};


export function setLocale(locale?: string): void {
    locale ??= DEFAULT_LOCALE;

    if (!LOCALE_REGEX.test(locale)) {
        console.warn(`Invalid locale "${locale}", using default "${DEFAULT_LOCALE}"`);
        return;
    }

    Config.locale.locale = locale;
    const [language, country] = locale.split("-");
    Config.locale.country = country || DEFAULT_COUNTRY;

    if (language) {
        if (language == DEFAULT_LANGUAGE || language in Config.fediverse.foreignLanguageServers) {
            Config.locale.language = language;
        } else {
            console.warn(`Language "${language}" not supported, using default "${Config.locale.defaultLanguage}"`);
        }
    }
};


// Quick load mode settings
if (isQuickMode) {
    Config.api[StorageKey.HOME_TIMELINE]!.initialMaxRecords = 400;
    Config.api[StorageKey.HOME_TIMELINE]!.lookbackForUpdatesMinutes = 15;
    Config.api.backgroundLoadIntervalSeconds = SECONDS_IN_HOUR;
    Config.api.maxRecordsForFeatureScoring = 480;
    Config.participatedTags.numTags = 20;
    Config.trending.tags.numTags = 20;
}

// Debug mode settings
if (isDebugMode) {
    Config.api[StorageKey.NOTIFICATIONS]!.numMinutesUntilStale = 1;
    Config.api[StorageKey.RECENT_USER_TOOTS]!.numMinutesUntilStale = 1;
    Config.api.maxRecordsForFeatureScoring = 20_000;
};

// Heavy load test settings
if (isLoadTest) {
    Config.api[StorageKey.HOME_TIMELINE]!.initialMaxRecords = 2_500;
    Config.toots.maxCachedTimelineToots = 5_000;
    Config.api.maxRecordsForFeatureScoring = 1_500;
    Config.participatedTags.maxToots = 500;
    Config.participatedTags.numTags = 50;
    Config.participatedTags.numTootsPerTag = 10;
    Config.trending.tags.maxToots = 1_000;
    Config.trending.tags.numTags = 40;
};


// Validate and set a few derived values in the config
function validateConfig(cfg: ConfigType | object): void {
    // Compute min value for FEDIVERSE_KEYS staleness and store on Config object
    const trendStalenesses = FEDIVERSE_KEYS.map(k => Config.api[k as StorageKey]?.numMinutesUntilStale);
    Config.api.staleDataTrendingMinutes = Math.min(...trendStalenesses as number[]);

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
