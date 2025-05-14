"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.API_DEFAULTS = exports.setLocale = exports.Config = exports.SECONDS_IN_WEEK = exports.SECONDS_IN_DAY = exports.SECONDS_IN_HOUR = exports.SECONDS_IN_MINUTE = void 0;
/*
 * Centralized location for non-user configurable settings.
 */
const types_1 = require("./types");
const environment_helpers_1 = require("./helpers/environment_helpers");
const log_helpers_1 = require("./helpers/log_helpers");
// Importing this const from time_helpers.ts yielded undefined, maybe bc of circular dependency?
exports.SECONDS_IN_MINUTE = 60;
exports.SECONDS_IN_HOUR = exports.SECONDS_IN_MINUTE * 60;
exports.SECONDS_IN_DAY = 24 * exports.SECONDS_IN_HOUR;
exports.SECONDS_IN_WEEK = 7 * exports.SECONDS_IN_DAY;
// Locale
const DEFAULT_LOCALE = "en-CA";
const DEFAULT_LANGUAGE = DEFAULT_LOCALE.split("-")[0];
const DEFAULT_COUNTRY = DEFAULT_LOCALE.split("-")[1];
const LOCALE_REGEX = /^[a-z]{2}(-[A-Za-z]{2})?$/;
// App level config that is not user configurable
exports.Config = {
    // Locale stuff
    country: DEFAULT_COUNTRY,
    defaultLanguage: DEFAULT_LANGUAGE,
    language: DEFAULT_LANGUAGE,
    locale: DEFAULT_LOCALE,
    //////////////////////////////////////
    // Number of toots config variables //
    ///////////////////////////////////////
    maxCachedTimelineToots: 3500,
    numDesiredTimelineToots: 800,
    // Participated tags
    numParticipatedTagsToFetchTootsFor: 30,
    numParticipatedTagToots: 200,
    numParticipatedTagTootsPerTag: 10,
    // Trending tags
    numTootsPerTrendingTag: 15,
    numTrendingTags: 20,
    numTrendingTagsToots: 200,
    // Trending toots
    numTrendingTootsPerServer: 30,
    // Timeline toots
    excessiveTags: 25,
    hashtagTootRetrievalDelaySeconds: 5,
    homeTimelineBatchSize: 80,
    incrementalLoadDelayMS: 500,
    lookbackForUpdatesMinutes: 180,
    maxTimelineDaysToFetch: 7,
    scoringBatchSize: 100,
    staleDataDefaultSeconds: 10 * exports.SECONDS_IN_MINUTE,
    staleDataTrendingSeconds: exports.SECONDS_IN_HOUR,
    timelineDecayExponent: 1.2,
    // TODO: merge with API_DEFAULTS
    staleDataSeconds: {
        [types_1.StorageKey.BLOCKED_ACCOUNTS]: 12 * exports.SECONDS_IN_HOUR,
        [types_1.StorageKey.FAVOURITED_TOOTS]: 12 * exports.SECONDS_IN_HOUR,
        [types_1.StorageKey.FEDIVERSE_POPULAR_SERVERS]: 24 * exports.SECONDS_IN_HOUR,
        [types_1.StorageKey.FEDIVERSE_TRENDING_LINKS]: 4 * exports.SECONDS_IN_HOUR,
        [types_1.StorageKey.FEDIVERSE_TRENDING_TAGS]: 4 * exports.SECONDS_IN_HOUR,
        [types_1.StorageKey.FEDIVERSE_TRENDING_TOOTS]: 4 * exports.SECONDS_IN_HOUR,
        [types_1.StorageKey.FOLLOWED_ACCOUNTS]: 4 * exports.SECONDS_IN_HOUR,
        [types_1.StorageKey.FOLLOWED_TAGS]: 4 * exports.SECONDS_IN_HOUR,
        [types_1.StorageKey.MUTED_ACCOUNTS]: 12 * exports.SECONDS_IN_HOUR,
        [types_1.StorageKey.PARTICIPATED_TAG_TOOTS]: 15 * exports.SECONDS_IN_MINUTE,
        [types_1.StorageKey.RECENT_NOTIFICATIONS]: 6 * exports.SECONDS_IN_HOUR,
        [types_1.StorageKey.RECENT_USER_TOOTS]: 2 * exports.SECONDS_IN_HOUR,
        [types_1.StorageKey.SERVER_SIDE_FILTERS]: 24 * exports.SECONDS_IN_HOUR,
        [types_1.StorageKey.TRENDING_TAG_TOOTS]: 15 * exports.SECONDS_IN_MINUTE,
    },
    // API stuff
    backgroundLoadIntervalSeconds: 10 * exports.SECONDS_IN_MINUTE,
    defaultRecordsPerPage: 40,
    // Right now this only applies to the initial load of toots for hashtags because those spawn a lot of parallel requests
    maxConcurrentRequestsInitial: 15,
    maxConcurrentRequestsBackground: 8,
    maxEndpointRecordsToPull: 5000,
    maxRecordsForFeatureScoring: 1500,
    minRecordsForFeatureScoring: 320,
    minServerMAU: 100,
    mutexWarnSeconds: 5,
    numServersToCheck: 30,
    batchCompleteTootsSleepBetweenMS: 250,
    batchCompleteTootsSize: 25,
    timeoutMS: 5000,
    // Trending tags and links
    excessiveTagsPenalty: 0.1,
    invalidTrendingTags: [
        "news",
        "photography",
    ],
    minTrendingTagTootsForPenalty: 9,
    numDaysToCountTrendingTagData: 3,
    numTrendingLinksPerServer: 20,
    numTrendingTagsPerServer: 20,
    // Demo app GUI stuff
    isAppFilterVisible: false,
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
        "bsky.brid.gy",
        "fediverse.one",
        "flipboard.com",
        "mastodon.art",
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
        "mastodon.gamedev.place",
        "med-mastodon.com",
        "toot.io",
    ],
    // Scorers
    scorersConfig: {
        // Global modifiers that affect all weighted scores
        [types_1.WeightName.TIME_DECAY]: {
            description: "Higher values favour recent toots more",
            minValue: 0.001,
        },
        // Trending toots usually have a lot of reblogs, likes, replies, etc. so they get disproportionately
        // high scores. To adjust for this we use a final adjustment to the score by multiplying by the
        // TRENDING weighting value.
        [types_1.WeightName.TRENDING]: {
            description: "Multiplier applied to trending toots, tags, and links",
            minValue: 0.001,
        },
        // If this value is 2 then square root scores, if it's 3 then cube root scores, etc.
        [types_1.WeightName.OUTLIER_DAMPENER]: {
            description: "Dampens the effect of outliers scores",
            minValue: 0.001,
        },
        // Weighted scores
        [types_1.WeightName.CHAOS]: {
            description: "Insert Chaos into the scoring (social media ist krieg)",
        },
        [types_1.WeightName.DIVERSITY]: {
            description: "Disfavour accounts that are tooting a lot right now",
        },
        [types_1.WeightName.FAVOURITED_ACCOUNTS]: {
            description: "Favour accounts you often favourite",
        },
        [types_1.WeightName.FAVOURITED_TAGS]: {
            description: "Favour toots containing hashtags you favourite",
        },
        [types_1.WeightName.FOLLOWED_TAGS]: {
            description: "Favour toots containing hashtags you follow",
        },
        [types_1.WeightName.IMAGE_ATTACHMENTS]: {
            description: "Favour image attachments",
        },
        [types_1.WeightName.INTERACTIONS]: {
            description: "Favour accounts that interact with your toots",
        },
        [types_1.WeightName.MENTIONS_FOLLOWED]: {
            description: "Favour toots that mention accounts you follow",
        },
        [types_1.WeightName.MOST_REPLIED_ACCOUNTS]: {
            description: "Favour accounts you often reply to",
        },
        [types_1.WeightName.MOST_RETOOTED_ACCOUNTS]: {
            description: "Favour accounts you often retoot",
        },
        [types_1.WeightName.NUM_FAVOURITES]: {
            description: "Favour things favourited by your server's users",
        },
        [types_1.WeightName.NUM_REPLIES]: {
            description: "Favour toots with lots of replies",
        },
        [types_1.WeightName.NUM_RETOOTS]: {
            description: "Favour toots that are retooted a lot",
        },
        [types_1.WeightName.PARTICIPATED_TAGS]: {
            description: "Favour hastags you've tooted about",
        },
        [types_1.WeightName.RETOOTED_IN_FEED]: {
            description: "Favour toots retooted by accounts you follow",
        },
        [types_1.WeightName.TRENDING_LINKS]: {
            description: "Favour links that are trending in the Fediverse",
        },
        [types_1.WeightName.TRENDING_TAGS]: {
            description: "Favour hashtags that are trending in the Fediverse",
        },
        [types_1.WeightName.TRENDING_TOOTS]: {
            description: "Favour toots that are trending in the Fediverse",
        },
        [types_1.WeightName.VIDEO_ATTACHMENTS]: {
            description: "Favour video attachments",
        },
    },
};
function setLocale(locale) {
    locale ??= DEFAULT_LOCALE;
    if (!LOCALE_REGEX.test(locale)) {
        console.warn(`Invalid locale "${locale}", using default "${DEFAULT_LOCALE}"`);
        return;
    }
    exports.Config.locale = locale;
    const [language, country] = locale.split("-");
    exports.Config.country = country || DEFAULT_COUNTRY;
    if (language) {
        if (language == DEFAULT_LANGUAGE || language in exports.Config.foreignLanguageServers) {
            exports.Config.language = language;
        }
        else {
            console.warn(`Language "${language}" not supported, using default "${exports.Config.defaultLanguage}"`);
        }
    }
}
exports.setLocale = setLocale;
;
// Debug mode settings
if (environment_helpers_1.isQuickMode) {
    exports.Config.backgroundLoadIntervalSeconds = exports.SECONDS_IN_HOUR;
    exports.Config.hashtagTootRetrievalDelaySeconds = 2;
    exports.Config.incrementalLoadDelayMS = 100;
    exports.Config.lookbackForUpdatesMinutes = 15;
    exports.Config.maxRecordsForFeatureScoring = 480;
    exports.Config.numDesiredTimelineToots = 400;
    exports.Config.numParticipatedTagsToFetchTootsFor = 20;
    exports.Config.numTrendingTags = 20;
}
if (environment_helpers_1.isDebugMode) {
    exports.Config.maxRecordsForFeatureScoring = 20000;
}
;
// Heavy load test settings
if (environment_helpers_1.isLoadTest) {
    exports.Config.maxCachedTimelineToots = 5000;
    exports.Config.maxRecordsForFeatureScoring = 1500;
    exports.Config.numDesiredTimelineToots = 2500;
    exports.Config.numParticipatedTagsToFetchTootsFor = 50;
    exports.Config.numParticipatedTagToots = 500;
    exports.Config.numParticipatedTagTootsPerTag = 10;
    exports.Config.numTrendingTags = 40;
    exports.Config.numTrendingTagsToots = 1000;
}
;
// Validate and set a few derived values in the config
function validateConfig(cfg) {
    // Compute min value for FEDIVERSE_KEYS staleness and store on Config object
    const trendStaleness = types_1.FEDIVERSE_KEYS.map(k => exports.Config.staleDataSeconds[k]);
    exports.Config.staleDataTrendingSeconds = Math.min(...trendStaleness);
    // Check that all the values are valid
    Object.entries(cfg).forEach(([key, value]) => {
        if (typeof value === "object") {
            validateConfig(value);
        }
        else if (typeof value == "number" && isNaN(value)) {
            (0, log_helpers_1.logAndThrowError)(`Config value at ${key} is NaN`);
        }
    });
}
;
validateConfig(exports.Config);
(0, log_helpers_1.traceLog)("[Config] validated config:", exports.Config);
// Default params for usage with API requests
exports.API_DEFAULTS = {
    [types_1.StorageKey.BLOCKED_ACCOUNTS]: {
        initialMaxRecords: exports.Config.maxEndpointRecordsToPull,
    },
    [types_1.StorageKey.FAVOURITED_TOOTS]: {
        initialMaxRecords: exports.Config.minRecordsForFeatureScoring,
    },
    [types_1.StorageKey.FOLLOWED_ACCOUNTS]: {
        batchSize: 80,
        initialMaxRecords: exports.Config.maxEndpointRecordsToPull,
    },
    [types_1.StorageKey.FOLLOWED_TAGS]: {
        batchSize: 100,
        initialMaxRecords: exports.Config.maxEndpointRecordsToPull,
    },
    [types_1.StorageKey.HOME_TIMELINE]: {
        initialMaxRecords: exports.Config.numDesiredTimelineToots,
        supportsMaxId: true,
    },
    [types_1.StorageKey.MUTED_ACCOUNTS]: {
        initialMaxRecords: exports.Config.maxEndpointRecordsToPull,
    },
    [types_1.StorageKey.RECENT_NOTIFICATIONS]: {
        batchSize: 80,
        initialMaxRecords: exports.Config.minRecordsForFeatureScoring,
        supportsMaxId: true,
    },
    [types_1.StorageKey.RECENT_USER_TOOTS]: {
        initialMaxRecords: exports.Config.minRecordsForFeatureScoring,
        supportsMaxId: true,
    },
};
//# sourceMappingURL=config.js.map