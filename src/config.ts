/*
 * Centralized location for non-user configurable settings.
 */
import { CacheKey, NonScoreWeightName, TagTootsType, type ApiCacheKey } from "./enums";
import { isDebugMode, isLoadTest, isQuickMode } from "./helpers/environment_helpers";
import { type NonScoreWeightInfoDict } from "./types";

// Cachey keys for the fediverse wide trending data
export const FEDIVERSE_CACHE_KEYS = [
    CacheKey.FEDIVERSE_POPULAR_SERVERS,
    CacheKey.FEDIVERSE_TRENDING_LINKS,
    CacheKey.FEDIVERSE_TRENDING_TAGS,
    CacheKey.FEDIVERSE_TRENDING_TOOTS,
];

// Importing this const from time_helpers.ts yielded undefined, maybe bc of circular dependency?
export const SECONDS_IN_MINUTE = 60;
export const MINUTES_IN_HOUR = 60;
export const MINUTES_IN_DAY = 24 * MINUTES_IN_HOUR;
export const SECONDS_IN_HOUR = SECONDS_IN_MINUTE * MINUTES_IN_HOUR;
export const SECONDS_IN_DAY = 24 * SECONDS_IN_HOUR;
export const SECONDS_IN_WEEK = 7 * SECONDS_IN_DAY;

// Number of notifications, replies, etc. to pull in initial load. KEY BOTTLENECK on RecentUserToots
export const MIN_RECORDS_FOR_FEATURE_SCORING = 320;
export const MAX_ENDPOINT_RECORDS_TO_PULL = 5_000;

// Locale
const DEFAULT_LOCALE = "en-CA";
const DEFAULT_LANGUAGE = DEFAULT_LOCALE.split("-")[0];
const DEFAULT_COUNTRY = DEFAULT_LOCALE.split("-")[1];
const LOCALE_REGEX = /^[a-z]{2}(-[A-Za-z]{2})?$/;

const LOG_PREFIX = '[Config]';

type ApiRequestDefaults = {
    allowBackgroundLoad?: boolean;      // If true, this endpoint will return the cache immediately and then load more data in the background
    initialMaxRecords?: number;         // How many records to pull in the initial bootstrap
    limit?: number;                     // Max per page is usually 40
    lookbackForUpdatesMinutes?: number; // How long to look back for updates (edits, increased reblogs, etc.)
    maxCacheRecords?: number;
    minutesUntilStale?: number;         // How long until the data is considered stale
    skipCache?: boolean;                // If true, skip the cache and always make a request
    supportsMinMaxId?: boolean;         // True if the endpoint supports min/maxId
};

type ApiDataConfig = Record<ApiCacheKey, ApiRequestDefaults>;

// See Config object for comments explaining these and other values
interface ApiConfig {
    backgroundLoadIntervalMinutes: number;
    backgroundLoadSleepBetweenRequestsMS: number;
    data: Readonly<ApiDataConfig>;
    daysBeforeFullCacheRefresh: number; // How many days before the cache is considered stale and needs to be refreshed completely
    defaultRecordsPerPage: number;
    maxConcurrentHashtagRequests: number;
    maxRecordsForFeatureScoring: number;
    maxSecondsPerPage: number;
    minutesUntilStaleDefault: number;
    mutexWarnSeconds: number;
    timeoutMS: number;
};

type FediverseConfig = {
    defaultServers: string[];
    foreignLanguageServers: Readonly<Record<string, string[]>>;
    minServerMAU: number;
    noMauServers: string[];
    noTrendingLinksServers: string[];
    numServersToCheck: number;
};

type LocaleConfig = {
    country: string;
    defaultLanguage: string;
    language: string;
    locale: string;
};

interface ParticipatedTagsConfig extends TagTootsConfig {
    minPctToCountRetoots: number;
};

type ScoringConfig = {
    excessiveTags: number;
    excessiveTagsPenalty: number;
    nonScoreWeightMinValue: number;
    nonScoreWeightsConfig: Readonly<NonScoreWeightInfoDict>;
    minTrendingTagTootsForPenalty: number,
    scoringBatchSize: number;
    timeDecayExponent: number;
};

export interface TagTootsConfig {
    invalidTags?: string[];
    maxToots: number;
    numTags: number;
    numTootsPerTag: number;
};

type TootsConfig = {
    batchCompleteSize: number;
    batchCompleteSleepBetweenMS: number;
    completeAfterMinutes: number;
    maxAgeInDays: number;
    maxTimelineLength: number;
    minCharsForLanguageDetect: number;
    saveChangesIntervalSeconds: number;
    truncateFullTimelineToLength: number;
};

type TrendingLinksConfig = {
    numTrendingLinksPerServer: number;
};

interface TrendingTagsConfig extends TagTootsConfig {
    numTagsPerServer: number;
};

type TrendingTootsConfig = {
    numTrendingTootsPerServer: number;
};

type TrendingConfig = {
    daysToCountTrendingData: number;
    links: Readonly<TrendingLinksConfig>;
    tags: Readonly<TrendingTagsConfig>;
    toots: Readonly<TrendingTootsConfig>;
};

// See Config for comments explaining these values
interface ConfigType {
    api: ApiConfig;
    favouritedTags: Readonly<TagTootsConfig>,
    fediverse: Readonly<FediverseConfig>;
    locale: Readonly<LocaleConfig>;
    participatedTags: Readonly<ParticipatedTagsConfig>;
    scoring: Readonly<ScoringConfig>;
    toots: Readonly<TootsConfig>;
    trending: Readonly<TrendingConfig>;
};


/**
 * Centralized application configuration class for non-user configurable settings.
 *
 * The Config class provides strongly-typed, centralized access to all core settings for API requests,
 * locale, scoring, trending, and fediverse-wide data. It includes logic for environment-specific overrides
 * (debug, quick load, load test), validation of config values, and locale/language management.
 *
 * @class
 * @implements {ConfigType}
 * @property {ApiConfig} api - API request and caching configuration.
 * @property {TagTootsConfig} favouritedTags - Settings for favourited tags and related toot fetching.
 * @property {FediverseConfig} fediverse - Fediverse-wide server and trending configuration.
 * @property {LocaleConfig} locale - Locale, language, and country settings.
 * @property {ParticipatedTagsConfig} participatedTags - Settings for user's participated tags.
 * @property {ScoringConfig} scoring - Scoring and weighting configuration for toots and tags.
 * @property {TootsConfig} toots - Timeline and toot cache configuration.
 * @property {TrendingConfig} trending - Trending data configuration for links, tags, and toots.
 */
class Config implements ConfigType {
    api = {
        backgroundLoadSleepBetweenRequestsMS: 1_000, // How long to wait between API requests during backgrund load
        backgroundLoadIntervalMinutes: 10,      // Time between background polling for additional user data after initial load
        daysBeforeFullCacheRefresh: 21,         // Days before the cache is considered stale and needs to be refreshed completely  // TODO: currently unused
        defaultRecordsPerPage: 40,              // Max per page is usually 40: https://docs.joinmastodon.org/methods/timelines/#request-2
        maxConcurrentHashtagRequests: 15,       // How many toot requests to make in parallel to the search and hashtag timeline endpoints
        maxRecordsForFeatureScoring: 1_500,     // number of notifications, replies, etc. to pull slowly in background for scoring
        maxSecondsPerPage: 30,                  // If loading a single page of results takes longer than this, just give up
        minutesUntilStaleDefault: 10,           // Default how long to wait before considering data stale
        mutexWarnSeconds: 5,                    // How long to wait before warning about a mutex lock
        timeoutMS: 2_500,                       // Timeout for API calls
        data: {                                 // See comments on ApiDataConfig for explanations of these values
            [CacheKey.BLOCKED_ACCOUNTS]: {
                initialMaxRecords: MAX_ENDPOINT_RECORDS_TO_PULL,
                minutesUntilStale: 12 * MINUTES_IN_HOUR,
            },
            [CacheKey.BLOCKED_DOMAINS]: {
                initialMaxRecords: MAX_ENDPOINT_RECORDS_TO_PULL,
                minutesUntilStale: MINUTES_IN_DAY,
            },
            [CacheKey.FAVOURITED_TOOTS]: {
                initialMaxRecords: Math.floor(MIN_RECORDS_FOR_FEATURE_SCORING / 2),  // Seems to be the biggest bottleneck
                minutesUntilStale: 12 * MINUTES_IN_HOUR,
            },
            [CacheKey.FEDIVERSE_POPULAR_SERVERS]: {
                minutesUntilStale: 5 * MINUTES_IN_DAY,
            },
            [CacheKey.FEDIVERSE_TRENDING_LINKS]: {
                minutesUntilStale: 4 * MINUTES_IN_HOUR,
            },
            [CacheKey.FEDIVERSE_TRENDING_TAGS]: {
                minutesUntilStale: 6 * MINUTES_IN_HOUR,
            },
            [CacheKey.FEDIVERSE_TRENDING_TOOTS]: {
                minutesUntilStale: 4 * MINUTES_IN_HOUR,
            },
            [CacheKey.FOLLOWED_ACCOUNTS]: {
                allowBackgroundLoad: true,
                initialMaxRecords: 1_600,
                limit: 80,
                minutesUntilStale: 12 * MINUTES_IN_HOUR,
            },
            [CacheKey.FOLLOWED_TAGS]: {
                initialMaxRecords: MAX_ENDPOINT_RECORDS_TO_PULL,
                limit: 100,
                minutesUntilStale: 12 * MINUTES_IN_HOUR,
            },
            [CacheKey.FOLLOWERS]: {
                initialMaxRecords: 1_600,
                limit: 80,
                minutesUntilStale: 24 * MINUTES_IN_HOUR,
            },
            [CacheKey.HASHTAG_TOOTS]: {
                // hashtag timeline toots are not cached as a group, they're pulled in small amounts and used
                // to create other sets of toots from a lot of small requests, e.g. TRENDING_TAG_TOOTS or PARTICIPATED_TAG_TOOTS
            },
            [CacheKey.HOME_TIMELINE_TOOTS]: {
                initialMaxRecords: 800,
                lookbackForUpdatesMinutes: 180,  // How far before the most recent toot we already have to look back for updates (edits, increased reblogs, etc.)
                supportsMinMaxId: true,
            },
            [CacheKey.HOMESERVER_TOOTS]: {
                initialMaxRecords: 20,
                minutesUntilStale: 10,
            },
            [CacheKey.INSTANCE_INFO]: {
                minutesUntilStale: 30 * MINUTES_IN_DAY,
            },
            [CacheKey.MUTED_ACCOUNTS]: {
                initialMaxRecords: MAX_ENDPOINT_RECORDS_TO_PULL,
                minutesUntilStale: 12 * MINUTES_IN_HOUR,
            },
            [CacheKey.NOTIFICATIONS]: {
                initialMaxRecords: MIN_RECORDS_FOR_FEATURE_SCORING,
                limit: 80,
                maxCacheRecords: 10_000,
                minutesUntilStale: 6 * MINUTES_IN_HOUR,
                supportsMinMaxId: true,
            },
            [CacheKey.RECENT_USER_TOOTS]: {
                initialMaxRecords: MIN_RECORDS_FOR_FEATURE_SCORING,
                minutesUntilStale: 2 * MINUTES_IN_HOUR,
                supportsMinMaxId: true,
            },
            [CacheKey.SERVER_SIDE_FILTERS]: {
                initialMaxRecords: MAX_ENDPOINT_RECORDS_TO_PULL,
                minutesUntilStale: 4 * MINUTES_IN_HOUR,
            },
            [TagTootsType.FAVOURITED]: {
                minutesUntilStale: 60,
            },
            [TagTootsType.PARTICIPATED]: {
                minutesUntilStale: 20,
            },
            [TagTootsType.TRENDING]: {
                minutesUntilStale: 15,
            },
        } as ApiDataConfig,
    }

    favouritedTags = {
        maxParticipations: 3,                   // Remove tags that have been used in more than this many toots by the user
        maxToots: 100,                          // How many toots to pull for each tag
        numTags: 15,                            // How many tags to pull toots for
        numTootsPerTag: 5,                      // How many toots to pull for each tag
    }

    fediverse = {
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
        // Servers chosen first for non english users
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
        } as Record<string, string[]>,
        // Non-mastodon servers and/or servers that don't make the MAU data available publicly
        noMauServers: [
            "agora.echelon.pl",
            "amf.didiermary.fr",
            "bsd.network",
            "bsky.brid.gy",
            "fedibird.com",
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
    }

    locale = {
        country: DEFAULT_COUNTRY,
        defaultLanguage: DEFAULT_LANGUAGE,
        language: DEFAULT_LANGUAGE,
        locale: DEFAULT_LOCALE,
    }

    participatedTags = {
        invalidTags: [
            "eupol",
            "news",
            "uspol",
            "uspolitics",
        ],
        maxToots: 200,                          // How many total toots to include for the user's most participated tags
        minPctToCountRetoots: 0.75,             // Minimum percentage of retweets to count them as "participation"
        numTags: 30,                            // Pull toots for this many of the user's most participated tags
        numTootsPerTag: 10,                     // How many toots to pull for each participated tag
    }

    scoring = {
        excessiveTags: 25,                      // Toots with more than this many tags will be penalized
        excessiveTagsPenalty: 0.1,              // Multiplier to penalize toots with excessive tags
        minTrendingTagTootsForPenalty: 9,       // Min number of toots w/a trending tag before DiversityFeedScorer applies a penalty
        nonScoreWeightMinValue: 0.001,          // Min value for non-score weights (trending, time decay, etc.)
        nonScoreWeightsConfig: {
            // Factor in an exponential function that gives a value between 0 and 1. See Scorer class for details.
            [NonScoreWeightName.TIME_DECAY]: {
                description: "Higher values favour recent toots more",
            },
            // Trending data has a lot of reblogs, likes, replies, etc. giving disproportionately high scores.
            // To adjust for this we multiply those scores by the TRENDING weighting value.
            [NonScoreWeightName.TRENDING]: {
                description: "Multiplier applied to trending toots, tags, and links",
            },
            // If this value is 2 then square root scores, if it's 3 then cube root scores, etc.
            [NonScoreWeightName.OUTLIER_DAMPENER]: {
                description: "Dampens the effect of outlier scores",
            },
        },
        scoringBatchSize: 100,                  // How many toots to score at once
        timeDecayExponent: 1.2,                 // Exponent for the time decay function (higher = more recent toots are favoured)
    }

    toots = {
        batchCompleteSize: 25,                  // How many toots call completeToot() on at once
        batchCompleteSleepBetweenMS: 150,       // How long to wait between batches of Toot.completeProperties() calls
        completeAfterMinutes: MINUTES_IN_DAY,   // Toots younger than this will periodically have their derived fields reevaluated by Toot.completeToot()
        maxAgeInDays: 7,                        // How long to keep toots in the cache before removing them
        maxContentPreviewChars: 110,            // How many characters to show in a Toot preview
        maxTimelineLength: 3_000,               // Max toots to keep in browser storage. Larger cache doesn't seem to impact performance much
        minCharsForLanguageDetect: 8,           // Minimum number of characters in a toot before we try to detect its language
        saveChangesIntervalSeconds: 30,         // How often to check for updates to toots' numTimesShown
        truncateFullTimelineToLength: 2_000,    // If on startup the timeline is full, truncate it to this length
    }

    trending = {
        daysToCountTrendingData: 3,             // Look at this many days of user counts when assessing trending data
        links: {
            numTrendingLinksPerServer: 20,      // How many trending links to pull from each server
        },
        tags: {
            invalidTags: [                      // Tags that are too generic to be considered trending
                "government",
                "news",
                "photography",
            ],
            maxToots: 200,                      // Max number of toots with trending tags to push into the user's feed
            numTagsPerServer: 20,               // How many trending tags to pull from each server (Mastodon default is 10)
            numTags: 20,                        // How many trending tags to use after ranking their popularity
            numTootsPerTag: 15,                 // How many toots to pull for each trending tag
        },
        toots: {
            numTrendingTootsPerServer: 30,      // How many trending toots to pull per server // TODO: unused?
        },
    }

    /** Construct a new Config instance, validate it, and logs the validated config. */
    constructor() {
        this.validate(this);
        console.debug(`${LOG_PREFIX} validated:`, this);
    };

    /**
     * Computes the minimum value of minutesUntilStale for all FEDIVERSE_CACHE_KEYS.
     * Warns if any required keys are missing a value.
     * @returns {number} The minimum minutes until trending data is considered stale, or 60 if not all keys are configured.
     */
    minTrendingMinutesUntilStale(): number {
        const trendStalenesses = FEDIVERSE_CACHE_KEYS.map(k => this.api.data[k]?.minutesUntilStale).filter(Boolean);

        if (trendStalenesses.length != FEDIVERSE_CACHE_KEYS.length) {
            console.warn(`${LOG_PREFIX} Not all FEDIVERSE_CACHE_KEYS have minutesUntilStale configured!`);
            return 60;
        } else {
            return Math.min(...trendStalenesses as number[]);
        }
    }

    /**
     * Sets the locale, language, and country for the application if supported.
     * Falls back to defaults if the locale is invalid or unsupported.
     * @param {string} [locale] - The locale string (e.g., "en-CA").
     */
    setLocale(locale?: string): void {
        locale ??= DEFAULT_LOCALE;

        if (!LOCALE_REGEX.test(locale)) {
            console.warn(`${LOG_PREFIX} Invalid locale "${locale}", using default "${DEFAULT_LOCALE}"`);
            return;
        }

        this.locale.locale = locale;
        const [language, country] = locale.split("-");
        this.locale.country = country || DEFAULT_COUNTRY;

        if (language) {
            if (language == DEFAULT_LANGUAGE || language in this.fediverse.foreignLanguageServers) {
                this.locale.language = language;
            } else {
                console.warn(`${LOG_PREFIX} Language "${language}" unsupported, defaulting to "${this.locale.defaultLanguage}"`);
            }
        }
    }

    /**
     * Validates config values for correctness (e.g., checks for NaN or empty strings).
     * Throws an error if invalid values are found.
     * @private
     * @param {ConfigType | object} [cfg] - The config object or sub-object to validate.
     */
    private validate(cfg?: ConfigType | object): void {
        if (!cfg) {
            if (!this.api.data[CacheKey.HOME_TIMELINE_TOOTS]?.lookbackForUpdatesMinutes) {
                throw new Error(`${LOG_PREFIX} HOME_TIMELINE_TOOTS lookbackForUpdatesMinutes is not set!`);
            }
        }

        // Check that all the values are valid
        Object.entries(cfg || this).forEach(([key, value]) => {
            if (typeof value === "object") {
                this.validate(value);
            } else if (typeof value == "number" && isNaN(value)) {
                const msg = `value at ${key} is NaN`
                console.error(`${LOG_PREFIX} ${msg}`);
                throw new Error(msg);
            } else if (typeof value == "string" && value.length == 0) {
                const msg = `value at ${key} is empty string`
                console.error(`${LOG_PREFIX} ${msg}`);
                throw new Error(msg);
            }
        });
    }
};


const config = new Config();

// Quick load mode settings
if (isQuickMode) {
    console.debug(`${LOG_PREFIX} QUICK_MODE enabled, applying debug settings...`);
    config.api.data[CacheKey.HOME_TIMELINE_TOOTS]!.initialMaxRecords = 240;
    config.api.data[CacheKey.HOME_TIMELINE_TOOTS]!.lookbackForUpdatesMinutes = 10;
    config.api.backgroundLoadIntervalMinutes = SECONDS_IN_HOUR;
    config.favouritedTags.numTags = 5;
    config.participatedTags.numTags = 10;
    config.trending.tags.numTags = 10;
}

// Debug mode settings
if (isDebugMode) {
    console.debug(`${LOG_PREFIX} FEDIALGO_DEBUG mode enabled, applying debug settings...`);
    config.api.data[CacheKey.FOLLOWED_ACCOUNTS]!.initialMaxRecords = 160;
    config.api.data[CacheKey.FOLLOWED_TAGS]!.minutesUntilStale = 60;
    config.api.data[CacheKey.FOLLOWERS]!.initialMaxRecords = 320;
    config.api.data[CacheKey.NOTIFICATIONS]!.minutesUntilStale = 10;
    config.api.data[CacheKey.RECENT_USER_TOOTS]!.minutesUntilStale = 5;
    config.api.backgroundLoadIntervalMinutes = 5;
    config.api.maxRecordsForFeatureScoring = 2_500;
    config.toots.maxTimelineLength = 1_500;
    config.toots.saveChangesIntervalSeconds = 15;
};

// Heavy load test settings
if (isLoadTest) {
    console.debug(`${LOG_PREFIX} LOAD_TEST mode enabled, applying debug settings...`);
    config.api.data[CacheKey.HOME_TIMELINE_TOOTS]!.initialMaxRecords = 2_500;
    config.toots.maxTimelineLength = 5_000;
    config.api.maxRecordsForFeatureScoring = 15_000;
    config.participatedTags.maxToots = 500;
    config.participatedTags.numTags = 50;
    config.participatedTags.numTootsPerTag = 10;
    config.trending.tags.maxToots = 1_000;
    config.trending.tags.numTags = 40;
};

export { config };
