/*
 * Centralized location for non-user configurable settings.
 */
import { FEDIVERSE_KEYS, NonScoreWeightInfoDict, NonScoreWeightName, CacheKey } from "./types";
import { isDebugMode, isLoadTest, isQuickMode } from "./helpers/environment_helpers";
import { logAndThrowError, traceLog } from "./helpers/log_helpers";

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
const LOG_PREFIX = "[Config]";

type ApiRequestDefaults = {
    initialMaxRecords?: number;         // How many records to pull in the initial bootstrap
    limit?: number;                     // Max per page is usually 40
    lookbackForUpdatesMinutes?: number; // How long to look back for updates (edits, increased reblogs, etc.)
    minutesUntilStale?: number;         // How long until the data is considered stale
    supportsMinMaxId?: boolean;         // True if the endpoint supports min/maxId
};

type ApiDataConfig = {
    [key in CacheKey]?: ApiRequestDefaults;
};

// See Config object for comments explaining these and other values
interface ApiConfig {
    backgroundLoadIntervalMinutes: number;
    data: ApiDataConfig;
    defaultRecordsPerPage: number;
    hashtagTootRetrievalDelaySeconds: number;
    maxConcurrentRequestsBackground: number;
    maxConcurrentRequestsInitial: number;
    maxRecordsForFeatureScoring: number;
    minutesUntilStaleDefault: number;
    mutexWarnSeconds: number;
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
    isAppFilterVisible: boolean;
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
    nonScoreWeightMinValue: number;
    nonScoreWeightsConfig: NonScoreWeightInfoDict;
    minTrendingTagTootsForPenalty: number,
    scoringBatchSize: number;
    timeDecayExponent: number;
};

interface TagTootsConfig {
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
    saveChangesIntervalSeconds: number;
};

type TrendingLinksConfig = {
    numTrendingLinksPerServer: number;
};

interface TrendingTagsConfig extends TagTootsConfig {
    invalidTrendingTags: string[];
    numTagsPerServer: number;
};

type TrendingTootsConfig = {
    numTrendingTootsPerServer: number;
};

type TrendingConfig = {
    daysToCountTrendingData: number;
    links: TrendingLinksConfig;
    tags: TrendingTagsConfig;
    toots: TrendingTootsConfig;
};


// See Config for comments explaining these values
interface ConfigType {
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
class Config implements ConfigType {
    api = {
        backgroundLoadIntervalMinutes: 10,      // Background poll for user data after initial load
        defaultRecordsPerPage: 40,              // Max per page is usually 40: https://docs.joinmastodon.org/methods/timelines/#request-2
        hashtagTootRetrievalDelaySeconds: 1,    // Delay before pulling trending & participated hashtag toots
        maxConcurrentRequestsInitial: 15,       // How many toot requests to make in parallel to the search and hashtag timeline endpoints
        maxConcurrentRequestsBackground: 15,    // How many toot requests to make in parallel once the initial load is done
        maxRecordsForFeatureScoring: 1_500,     // number of notifications, replies, etc. to pull slowly in background for scoring
        minutesUntilStaleDefault: 10,           // Default how long to wait before considering data stale
        mutexWarnSeconds: 5,                    // How long to wait before warning about a mutex lock
        timeoutMS: 5_000,                       // Timeout for API calls
        data: {                                 // See comments on ApiDataConfig for explanations of these values
            [CacheKey.BLOCKED_ACCOUNTS]: {
                initialMaxRecords: MAX_ENDPOINT_RECORDS_TO_PULL,
                minutesUntilStale: 12 * MINUTES_IN_HOUR,
            },
            [CacheKey.FAVOURITED_TOOTS]: {
                initialMaxRecords: MIN_RECORDS_FOR_FEATURE_SCORING,
                minutesUntilStale: 12 * MINUTES_IN_HOUR,
            },
            [CacheKey.FEDIVERSE_POPULAR_SERVERS]: {
                minutesUntilStale: 24 * MINUTES_IN_HOUR,
            },
            [CacheKey.FEDIVERSE_TRENDING_LINKS]: {
                minutesUntilStale: 4 * MINUTES_IN_HOUR,
            },
            [CacheKey.FEDIVERSE_TRENDING_TAGS]: {
                minutesUntilStale: 4 * MINUTES_IN_HOUR,
            },
            [CacheKey.FEDIVERSE_TRENDING_TOOTS]: {
                minutesUntilStale: 4 * MINUTES_IN_HOUR,
            },
            [CacheKey.FOLLOWED_ACCOUNTS]: {
                initialMaxRecords: MAX_ENDPOINT_RECORDS_TO_PULL,
                limit: 80,
                minutesUntilStale: 4 * MINUTES_IN_HOUR,
            },
            [CacheKey.FOLLOWED_TAGS]: {
                initialMaxRecords: MAX_ENDPOINT_RECORDS_TO_PULL,
                limit: 100,
                minutesUntilStale: 4 * MINUTES_IN_HOUR,
            },
            [CacheKey.HASHTAG_TOOTS]: {
                // TODO: this is here for the mutexes but nothing is actually cached
            },
            [CacheKey.HOME_TIMELINE]: {
                initialMaxRecords: 800,
                lookbackForUpdatesMinutes: 180,    // How long to look back for updates (edits, increased reblogs, etc.)
                supportsMinMaxId: true,
            },
            [CacheKey.MUTED_ACCOUNTS]: {
                initialMaxRecords: MAX_ENDPOINT_RECORDS_TO_PULL,
                minutesUntilStale: 12 * MINUTES_IN_HOUR,
            },
            [CacheKey.PARTICIPATED_TAG_TOOTS]: {
                minutesUntilStale: 15,
            },
            [CacheKey.NOTIFICATIONS]: {
                initialMaxRecords: MIN_RECORDS_FOR_FEATURE_SCORING,
                limit: 80,
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
                minutesUntilStale: 24 * MINUTES_IN_HOUR,
            },
            [CacheKey.TIMELINE]: {
                // TODO: shouldn't have to configure this empty object but we do for typing reasons
            },
            [CacheKey.TRENDING_TAG_TOOTS]: {
                minutesUntilStale: 15,
            },
        } as ApiDataConfig,
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
    }

    gui = {
        isAppFilterVisible: false,              // 99% of toots don't have the app field set so don't show the filter section
    }

    locale = {
        country: DEFAULT_COUNTRY,
        defaultLanguage: DEFAULT_LANGUAGE,
        language: DEFAULT_LANGUAGE,
        locale: DEFAULT_LOCALE,
    }

    participatedTags = {
        maxToots: 200,                          // How many total toots to include for the user's most participated tags
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
        batchCompleteSleepBetweenMS: 250,       // How long to wait between batches of Toot.completeProperties() calls
        completeAfterMinutes: MINUTES_IN_DAY,   // Toots younger than this will periodically have their derived fields reevaluated by Toot.completeToot()
        maxAgeInDays: 7,                        // How long to keep toots in the cache before removing them
        maxTimelineLength: 3_000,               // Max toots to keep in browser storage. Larger cache doesn't seem to impact performance much
        saveChangesIntervalSeconds: 30,         // How often to check for updates to toots' numTimesShown
    }

    trending = {
        daysToCountTrendingData: 3,             // Look at this many days of user counts when assessing trending data
        links: {
            numTrendingLinksPerServer: 20,      // How many trending links to pull from each server
        },
        tags: {
            invalidTrendingTags: [              // Tags that are too generic to be considered trending
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

    constructor() {
        this.validate();
        traceLog(`${LOG_PREFIX} validated:`, this);
    };

    // Compute min value for FEDIVERSE_KEYS minutesUntilStale
    minTrendingMinutesUntilStale(): number {
        const trendStalenesses = FEDIVERSE_KEYS.map(k => this.api.data[k]?.minutesUntilStale).filter(Boolean);

        if (trendStalenesses.length != FEDIVERSE_KEYS.length) {
            console.warn(`${LOG_PREFIX} Not all FEDIVERSE_KEYS have minutesUntilStale configured!`);
            return 60;
        } else {
            return Math.min(...trendStalenesses as number[]);
        }
    }

    // Set the locale, language, and country if we have anything configured to support that language
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

    // Check for NaN values in number fields and emptry strings in string fields
    private validate(cfg?: ConfigType | object): void {
        cfg ??= this;

        // Check that all the values are valid
        Object.entries(cfg).forEach(([key, value]) => {
            if (typeof value === "object") {
                this.validate(value);
            } else if (typeof value == "number" && isNaN(value)) {
                logAndThrowError(`${LOG_PREFIX} value at ${key} is NaN`);
            } else if (typeof value == "string" && value.length == 0) {
                logAndThrowError(`${LOG_PREFIX} value at ${key} is empty string`);
            }
        });
    }
};


const config = new Config();

// Quick load mode settings
if (isQuickMode) {
    config.api.data[CacheKey.HOME_TIMELINE]!.initialMaxRecords = 400;
    config.api.data[CacheKey.HOME_TIMELINE]!.lookbackForUpdatesMinutes = 15;
    config.api.backgroundLoadIntervalMinutes = SECONDS_IN_HOUR;
    config.participatedTags.numTags = 20;
    config.trending.tags.numTags = 20;
}

// Debug mode settings
if (isDebugMode) {
    config.api.data[CacheKey.NOTIFICATIONS]!.minutesUntilStale = 1;
    config.api.data[CacheKey.RECENT_USER_TOOTS]!.minutesUntilStale = 1;
    config.api.maxRecordsForFeatureScoring = 2_500;
    config.toots.saveChangesIntervalSeconds = 5;
};

// Heavy load test settings
if (isLoadTest) {
    config.api.data[CacheKey.HOME_TIMELINE]!.initialMaxRecords = 2_500;
    config.toots.maxTimelineLength = 5_000;
    config.api.maxRecordsForFeatureScoring = 15_000;
    config.participatedTags.maxToots = 500;
    config.participatedTags.numTags = 50;
    config.participatedTags.numTootsPerTag = 10;
    config.trending.tags.maxToots = 1_000;
    config.trending.tags.numTags = 40;
};

export { config };
