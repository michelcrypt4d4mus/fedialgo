"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = exports.MAX_ENDPOINT_RECORDS_TO_PULL = exports.MIN_RECORDS_FOR_FEATURE_SCORING = exports.SECONDS_IN_WEEK = exports.SECONDS_IN_DAY = exports.SECONDS_IN_HOUR = exports.MINUTES_IN_DAY = exports.MINUTES_IN_HOUR = exports.SECONDS_IN_MINUTE = exports.FEDIVERSE_CACHE_KEYS = void 0;
/*
 * Centralized location for non-user configurable settings.
 */
const enums_1 = require("./enums");
const environment_helpers_1 = require("./helpers/environment_helpers");
// Cachey keys for the fediverse wide trending data
exports.FEDIVERSE_CACHE_KEYS = [
    enums_1.CacheKey.FEDIVERSE_POPULAR_SERVERS,
    enums_1.CacheKey.FEDIVERSE_TRENDING_LINKS,
    enums_1.CacheKey.FEDIVERSE_TRENDING_TAGS,
    enums_1.CacheKey.FEDIVERSE_TRENDING_TOOTS,
];
// Importing this const from time_helpers.ts yielded undefined, maybe bc of circular dependency?
exports.SECONDS_IN_MINUTE = 60;
exports.MINUTES_IN_HOUR = 60;
exports.MINUTES_IN_DAY = 24 * exports.MINUTES_IN_HOUR;
exports.SECONDS_IN_HOUR = exports.SECONDS_IN_MINUTE * exports.MINUTES_IN_HOUR;
exports.SECONDS_IN_DAY = 24 * exports.SECONDS_IN_HOUR;
exports.SECONDS_IN_WEEK = 7 * exports.SECONDS_IN_DAY;
// Number of notifications, replies, etc. to pull in initial load. KEY BOTTLENECK on RecentUserToots
exports.MIN_RECORDS_FOR_FEATURE_SCORING = 320;
exports.MAX_ENDPOINT_RECORDS_TO_PULL = 5000;
// Locale
const DEFAULT_LOCALE = "en-CA";
const DEFAULT_LANGUAGE = DEFAULT_LOCALE.split("-")[0];
const DEFAULT_COUNTRY = DEFAULT_LOCALE.split("-")[1];
const LOCALE_REGEX = /^[a-z]{2}(-[A-Za-z]{2})?$/;
const LOG_PREFIX = '[Config]';
;
;
;
;
;
// App level config that is not user configurable
class Config {
    api = {
        backgroundLoadSleepBetweenRequestsMS: 1500,
        backgroundLoadIntervalMinutes: 10,
        defaultRecordsPerPage: 40,
        hashtagTootRetrievalDelaySeconds: 1,
        maxConcurrentHashtagRequests: 15,
        maxRecordsForFeatureScoring: 1500,
        maxSecondsPerPage: 30,
        minutesUntilStaleDefault: 10,
        mutexWarnSeconds: 5,
        timeoutMS: 2500,
        data: {
            [enums_1.CacheKey.BLOCKED_ACCOUNTS]: {
                initialMaxRecords: exports.MAX_ENDPOINT_RECORDS_TO_PULL,
                minutesUntilStale: 12 * exports.MINUTES_IN_HOUR,
            },
            [enums_1.TagTootsCacheKey.FAVOURITED_TAG_TOOTS]: {
                minutesUntilStale: 60,
            },
            [enums_1.CacheKey.FAVOURITED_TOOTS]: {
                initialMaxRecords: Math.floor(exports.MIN_RECORDS_FOR_FEATURE_SCORING / 2),
                minutesUntilStale: 12 * exports.MINUTES_IN_HOUR,
            },
            [enums_1.CacheKey.FEDIVERSE_POPULAR_SERVERS]: {
                minutesUntilStale: 72 * exports.MINUTES_IN_HOUR,
            },
            [enums_1.CacheKey.FEDIVERSE_TRENDING_LINKS]: {
                minutesUntilStale: 4 * exports.MINUTES_IN_HOUR,
            },
            [enums_1.CacheKey.FEDIVERSE_TRENDING_TAGS]: {
                minutesUntilStale: 6 * exports.MINUTES_IN_HOUR,
            },
            [enums_1.CacheKey.FEDIVERSE_TRENDING_TOOTS]: {
                minutesUntilStale: 4 * exports.MINUTES_IN_HOUR,
            },
            [enums_1.CacheKey.FOLLOWED_ACCOUNTS]: {
                allowBackgroundLoad: true,
                initialMaxRecords: 1600,
                limit: 80,
                minutesUntilStale: 12 * exports.MINUTES_IN_HOUR,
            },
            [enums_1.CacheKey.FOLLOWED_TAGS]: {
                initialMaxRecords: exports.MAX_ENDPOINT_RECORDS_TO_PULL,
                limit: 100,
                minutesUntilStale: 12 * exports.MINUTES_IN_HOUR,
            },
            [enums_1.CacheKey.FOLLOWERS]: {
                initialMaxRecords: 1600,
                limit: 80,
                minutesUntilStale: 24 * exports.MINUTES_IN_HOUR,
            },
            [enums_1.CacheKey.HASHTAG_TOOTS]: {
            // hashtag timeline toots are not cached as a group, they're pulled in small amounts and used
            // to create other sets of toots from a lot of small requests, e.g. TRENDING_TAG_TOOTS or PARTICIPATED_TAG_TOOTS
            },
            [enums_1.CacheKey.HOME_TIMELINE_TOOTS]: {
                initialMaxRecords: 800,
                lookbackForUpdatesMinutes: 180,
                supportsMinMaxId: true,
            },
            [enums_1.CacheKey.MUTED_ACCOUNTS]: {
                initialMaxRecords: exports.MAX_ENDPOINT_RECORDS_TO_PULL,
                minutesUntilStale: 12 * exports.MINUTES_IN_HOUR,
            },
            [enums_1.CacheKey.NOTIFICATIONS]: {
                initialMaxRecords: exports.MIN_RECORDS_FOR_FEATURE_SCORING,
                limit: 80,
                maxCacheRecords: 10000,
                minutesUntilStale: 6 * exports.MINUTES_IN_HOUR,
                supportsMinMaxId: true,
            },
            [enums_1.TagTootsCacheKey.PARTICIPATED_TAG_TOOTS]: {
                minutesUntilStale: 20,
            },
            [enums_1.CacheKey.RECENT_USER_TOOTS]: {
                initialMaxRecords: exports.MIN_RECORDS_FOR_FEATURE_SCORING,
                minutesUntilStale: 2 * exports.MINUTES_IN_HOUR,
                supportsMinMaxId: true,
            },
            [enums_1.CacheKey.SERVER_SIDE_FILTERS]: {
                initialMaxRecords: exports.MAX_ENDPOINT_RECORDS_TO_PULL,
                minutesUntilStale: 4 * exports.MINUTES_IN_HOUR,
            },
            [enums_1.CacheKey.TIMELINE_TOOTS]: {
            // TODO: TIMELINE_TOOTS are assembled from all the other feeds, not API requests directly. This is here for type safety.
            },
            [enums_1.TagTootsCacheKey.TRENDING_TAG_TOOTS]: {
                minutesUntilStale: 15,
            },
        },
    };
    favouritedTags = {
        maxToots: 100,
        numTags: 15,
        numTootsPerTag: 5,
        maxParticipations: 3, // Remove tags that have been used in more than this many toots by the user
    };
    fediverse = {
        minServerMAU: 100,
        numServersToCheck: 30,
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
            "eu": [
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
            "bsd.network",
            "bsky.brid.gy",
            "fediverse.one",
            "flipboard.com",
            "mastodon.art",
            "mastodon.gamedev.place",
            "mastodon.sdf.org",
            'mathstodon.xyz',
            "mstdn.social",
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
    };
    locale = {
        country: DEFAULT_COUNTRY,
        defaultLanguage: DEFAULT_LANGUAGE,
        language: DEFAULT_LANGUAGE,
        locale: DEFAULT_LOCALE,
    };
    participatedTags = {
        invalidTags: [
            "eupol",
            "news",
            "uspol",
            "uspolitics",
        ],
        maxToots: 200,
        minPctToCountRetoots: 0.75,
        numTags: 30,
        numTootsPerTag: 10, // How many toots to pull for each participated tag
    };
    scoring = {
        excessiveTags: 25,
        excessiveTagsPenalty: 0.1,
        minTrendingTagTootsForPenalty: 9,
        nonScoreWeightMinValue: 0.001,
        nonScoreWeightsConfig: {
            // Factor in an exponential function that gives a value between 0 and 1. See Scorer class for details.
            [enums_1.NonScoreWeightName.TIME_DECAY]: {
                description: "Higher values favour recent toots more",
            },
            // Trending data has a lot of reblogs, likes, replies, etc. giving disproportionately high scores.
            // To adjust for this we multiply those scores by the TRENDING weighting value.
            [enums_1.NonScoreWeightName.TRENDING]: {
                description: "Multiplier applied to trending toots, tags, and links",
            },
            // If this value is 2 then square root scores, if it's 3 then cube root scores, etc.
            [enums_1.NonScoreWeightName.OUTLIER_DAMPENER]: {
                description: "Dampens the effect of outlier scores",
            },
        },
        scoringBatchSize: 100,
        timeDecayExponent: 1.2, // Exponent for the time decay function (higher = more recent toots are favoured)
    };
    toots = {
        batchCompleteSize: 25,
        batchCompleteSleepBetweenMS: 150,
        completeAfterMinutes: exports.MINUTES_IN_DAY,
        maxAgeInDays: 7,
        maxTimelineLength: 3000,
        saveChangesIntervalSeconds: 30,
        truncateFullTimelineToLength: 2000, // If on startup the timeline is full, truncate it to this length
    };
    trending = {
        daysToCountTrendingData: 3,
        links: {
            numTrendingLinksPerServer: 20, // How many trending links to pull from each server
        },
        tags: {
            invalidTags: [
                "government",
                "news",
                "photography",
            ],
            maxToots: 200,
            numTagsPerServer: 20,
            numTags: 20,
            numTootsPerTag: 15, // How many toots to pull for each trending tag
        },
        toots: {
            numTrendingTootsPerServer: 30, // How many trending toots to pull per server // TODO: unused?
        },
    };
    constructor() {
        this.validate();
        console.debug(`${LOG_PREFIX} validated:`, this);
    }
    ;
    // Compute min value for FEDIVERSE_CACHE_KEYS minutesUntilStale
    minTrendingMinutesUntilStale() {
        const trendStalenesses = exports.FEDIVERSE_CACHE_KEYS.map(k => this.api.data[k]?.minutesUntilStale).filter(Boolean);
        if (trendStalenesses.length != exports.FEDIVERSE_CACHE_KEYS.length) {
            console.warn(`${LOG_PREFIX} Not all FEDIVERSE_CACHE_KEYS have minutesUntilStale configured!`);
            return 60;
        }
        else {
            return Math.min(...trendStalenesses);
        }
    }
    // Set the locale, language, and country if we have anything configured to support that language
    setLocale(locale) {
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
            }
            else {
                console.warn(`${LOG_PREFIX} Language "${language}" unsupported, defaulting to "${this.locale.defaultLanguage}"`);
            }
        }
    }
    // Check for NaN values in number fields and emptry strings in string fields
    validate(cfg) {
        cfg ??= this;
        // Check that all the values are valid
        Object.entries(cfg).forEach(([key, value]) => {
            if (typeof value === "object") {
                this.validate(value);
            }
            else if (typeof value == "number" && isNaN(value)) {
                const msg = `value at ${key} is NaN`;
                console.error(`${LOG_PREFIX} ${msg}`);
                throw new Error(msg);
            }
            else if (typeof value == "string" && value.length == 0) {
                const msg = `value at ${key} is empty string`;
                console.error(`${LOG_PREFIX} ${msg}`);
                throw new Error(msg);
            }
        });
    }
}
;
const config = new Config();
exports.config = config;
// Quick load mode settings
if (environment_helpers_1.isQuickMode) {
    console.debug(`${LOG_PREFIX} QUICK_MODE enabled, applying debug settings...`);
    config.api.data[enums_1.CacheKey.HOME_TIMELINE_TOOTS].initialMaxRecords = 240;
    config.api.data[enums_1.CacheKey.HOME_TIMELINE_TOOTS].lookbackForUpdatesMinutes = 10;
    config.api.backgroundLoadIntervalMinutes = exports.SECONDS_IN_HOUR;
    config.favouritedTags.numTags = 5;
    config.participatedTags.numTags = 10;
    config.trending.tags.numTags = 10;
}
// Debug mode settings
if (environment_helpers_1.isDebugMode) {
    console.debug(`${LOG_PREFIX} FEDIALGO_DEBUG mode enabled, applying debug settings...`);
    config.api.data[enums_1.CacheKey.FOLLOWED_ACCOUNTS].initialMaxRecords = 160;
    config.api.data[enums_1.CacheKey.FOLLOWED_TAGS].minutesUntilStale = 60;
    config.api.data[enums_1.CacheKey.FOLLOWERS].initialMaxRecords = 320;
    config.api.data[enums_1.CacheKey.NOTIFICATIONS].minutesUntilStale = 10;
    config.api.data[enums_1.CacheKey.RECENT_USER_TOOTS].minutesUntilStale = 5;
    config.api.backgroundLoadIntervalMinutes = 5;
    config.api.maxRecordsForFeatureScoring = 2500;
    config.toots.maxTimelineLength = 1500;
    config.toots.saveChangesIntervalSeconds = 15;
}
;
// Heavy load test settings
if (environment_helpers_1.isLoadTest) {
    console.debug(`${LOG_PREFIX} LOAD_TEST mode enabled, applying debug settings...`);
    config.api.data[enums_1.CacheKey.HOME_TIMELINE_TOOTS].initialMaxRecords = 2500;
    config.toots.maxTimelineLength = 5000;
    config.api.maxRecordsForFeatureScoring = 15000;
    config.participatedTags.maxToots = 500;
    config.participatedTags.numTags = 50;
    config.participatedTags.numTootsPerTag = 10;
    config.trending.tags.maxToots = 1000;
    config.trending.tags.numTags = 40;
}
;
//# sourceMappingURL=config.js.map