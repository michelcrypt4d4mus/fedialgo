"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setLocale = exports.Config = exports.MAX_ENDPOINT_RECORDS_TO_PULL = exports.MIN_RECORDS_FOR_FEATURE_SCORING = exports.SECONDS_IN_WEEK = exports.SECONDS_IN_DAY = exports.SECONDS_IN_HOUR = exports.MINUTES_IN_DAY = exports.MINUTES_IN_HOUR = exports.SECONDS_IN_MINUTE = void 0;
/*
 * Centralized location for non-user configurable settings.
 */
const types_1 = require("./types");
const environment_helpers_1 = require("./helpers/environment_helpers");
const log_helpers_1 = require("./helpers/log_helpers");
// Importing this const from time_helpers.ts yielded undefined, maybe bc of circular dependency?
exports.SECONDS_IN_MINUTE = 60;
exports.MINUTES_IN_HOUR = 60;
exports.MINUTES_IN_DAY = 24 * exports.MINUTES_IN_HOUR;
exports.SECONDS_IN_HOUR = exports.SECONDS_IN_MINUTE * exports.MINUTES_IN_HOUR;
exports.SECONDS_IN_DAY = 24 * exports.SECONDS_IN_HOUR;
exports.SECONDS_IN_WEEK = 7 * exports.SECONDS_IN_DAY;
// Locale
const DEFAULT_LOCALE = "en-CA";
const DEFAULT_LANGUAGE = DEFAULT_LOCALE.split("-")[0];
const DEFAULT_COUNTRY = DEFAULT_LOCALE.split("-")[1];
const LOCALE_REGEX = /^[a-z]{2}(-[A-Za-z]{2})?$/;
// Number of notifications, replies, etc. to pull in initial load. KEY BOTTLENECK on RecentUserToots
exports.MIN_RECORDS_FOR_FEATURE_SCORING = 320;
exports.MAX_ENDPOINT_RECORDS_TO_PULL = 5000;
;
;
;
// App level config that is not user configurable
exports.Config = {
    api: {
        [types_1.StorageKey.BLOCKED_ACCOUNTS]: {
            initialMaxRecords: exports.MAX_ENDPOINT_RECORDS_TO_PULL,
            numMinutesUntilStale: 12 * exports.MINUTES_IN_HOUR,
        },
        [types_1.StorageKey.FAVOURITED_TOOTS]: {
            initialMaxRecords: exports.MIN_RECORDS_FOR_FEATURE_SCORING,
            numMinutesUntilStale: 12 * exports.MINUTES_IN_HOUR,
        },
        [types_1.StorageKey.FEDIVERSE_POPULAR_SERVERS]: {
            numMinutesUntilStale: 24 * exports.MINUTES_IN_HOUR,
        },
        [types_1.StorageKey.FEDIVERSE_TRENDING_LINKS]: {
            numMinutesUntilStale: 4 * exports.MINUTES_IN_HOUR,
        },
        [types_1.StorageKey.FEDIVERSE_TRENDING_TAGS]: {
            numMinutesUntilStale: 4 * exports.MINUTES_IN_HOUR,
        },
        [types_1.StorageKey.FEDIVERSE_TRENDING_TOOTS]: {
            numMinutesUntilStale: 4 * exports.MINUTES_IN_HOUR,
        },
        [types_1.StorageKey.FOLLOWED_ACCOUNTS]: {
            initialMaxRecords: exports.MAX_ENDPOINT_RECORDS_TO_PULL,
            limit: 80,
            numMinutesUntilStale: 4 * exports.MINUTES_IN_HOUR,
        },
        [types_1.StorageKey.FOLLOWED_TAGS]: {
            initialMaxRecords: exports.MAX_ENDPOINT_RECORDS_TO_PULL,
            limit: 100,
            numMinutesUntilStale: 4 * exports.MINUTES_IN_HOUR,
        },
        [types_1.StorageKey.HOME_TIMELINE]: {
            initialMaxRecords: 800,
            lookbackForUpdatesMinutes: 180,
            supportsMinMaxId: true,
        },
        [types_1.StorageKey.MUTED_ACCOUNTS]: {
            initialMaxRecords: exports.MAX_ENDPOINT_RECORDS_TO_PULL,
            numMinutesUntilStale: 12 * exports.MINUTES_IN_HOUR,
        },
        [types_1.StorageKey.PARTICIPATED_TAG_TOOTS]: {
            numMinutesUntilStale: 15,
        },
        [types_1.StorageKey.NOTIFICATIONS]: {
            initialMaxRecords: exports.MIN_RECORDS_FOR_FEATURE_SCORING,
            limit: 80,
            numMinutesUntilStale: 6 * exports.MINUTES_IN_HOUR,
            supportsMinMaxId: true,
        },
        [types_1.StorageKey.RECENT_USER_TOOTS]: {
            initialMaxRecords: exports.MIN_RECORDS_FOR_FEATURE_SCORING,
            numMinutesUntilStale: 2 * exports.MINUTES_IN_HOUR,
            supportsMinMaxId: true,
        },
        [types_1.StorageKey.SERVER_SIDE_FILTERS]: {
            initialMaxRecords: exports.MAX_ENDPOINT_RECORDS_TO_PULL,
            numMinutesUntilStale: 24 * exports.MINUTES_IN_HOUR,
        },
        [types_1.StorageKey.TRENDING_TAG_TOOTS]: {
            numMinutesUntilStale: 15,
        },
        backgroundLoadIntervalSeconds: 10 * exports.SECONDS_IN_MINUTE,
        defaultRecordsPerPage: 40,
        hashtagTootRetrievalDelaySeconds: 3,
        maxConcurrentRequestsInitial: 15,
        maxConcurrentRequestsBackground: 8,
        maxRecordsForFeatureScoring: 1500,
        mutexWarnSeconds: 5,
        staleDataDefaultMinutes: 10,
        staleDataTrendingMinutes: 60,
        timeoutMS: 5000, // Timeout for API calls
    },
    fediverse: {
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
    },
    gui: {
        isAppFilterVisible: false, // 99% of toots don't have the app field set so don't show the filter section
    },
    locale: {
        country: DEFAULT_COUNTRY,
        defaultLanguage: DEFAULT_LANGUAGE,
        language: DEFAULT_LANGUAGE,
        locale: DEFAULT_LOCALE,
    },
    participatedTags: {
        maxToots: 200,
        numTags: 30,
        numTootsPerTag: 10, // How many toots to pull for each participated tag
    },
    scoring: {
        excessiveTags: 25,
        excessiveTagsPenalty: 0.1,
        minTrendingTagTootsForPenalty: 9,
        scoringBatchSize: 100,
        timelineDecayExponent: 1.2,
        weightsConfig: {
            // Global modifiers that affect all weighted scores
            [types_1.NonScoreWeight.TIME_DECAY]: {
                description: "Higher values favour recent toots more",
                minValue: 0.001,
            },
            // Trending toots usually have a lot of reblogs, likes, replies, etc. so they get disproportionately
            // high scores. To adjust for this we use a final adjustment to the score by multiplying by the
            // TRENDING weighting value.
            [types_1.NonScoreWeight.TRENDING]: {
                description: "Multiplier applied to trending toots, tags, and links",
                minValue: 0.001,
            },
            // If this value is 2 then square root scores, if it's 3 then cube root scores, etc.
            [types_1.NonScoreWeight.OUTLIER_DAMPENER]: {
                description: "Dampens the effect of outlier scores",
                minValue: 0.001,
            },
            // Weighted scores
            [types_1.ScoreName.ALREADY_SHOWN]: {
                description: 'Disfavour toots that have been marked as already seen'
            },
            [types_1.ScoreName.CHAOS]: {
                description: "Insert Chaos into the scoring (social media ist krieg)",
            },
            [types_1.ScoreName.DIVERSITY]: {
                description: "Disfavour accounts that are tooting a lot right now",
            },
            [types_1.ScoreName.FAVOURITED_ACCOUNTS]: {
                description: "Favour accounts you often favourite",
            },
            [types_1.ScoreName.FAVOURITED_TAGS]: {
                description: "Favour toots containing hashtags you favourite",
            },
            [types_1.ScoreName.FOLLOWED_TAGS]: {
                description: "Favour toots containing hashtags you follow",
            },
            [types_1.ScoreName.IMAGE_ATTACHMENTS]: {
                description: "Favour image attachments",
            },
            [types_1.ScoreName.INTERACTIONS]: {
                description: "Favour accounts that interact with your toots",
            },
            [types_1.ScoreName.MENTIONS_FOLLOWED]: {
                description: "Favour toots that mention accounts you follow",
            },
            [types_1.ScoreName.MOST_REPLIED_ACCOUNTS]: {
                description: "Favour accounts you often reply to",
            },
            [types_1.ScoreName.MOST_RETOOTED_ACCOUNTS]: {
                description: "Favour accounts you often retoot",
            },
            [types_1.ScoreName.NUM_FAVOURITES]: {
                description: "Favour things favourited by your server's users",
            },
            [types_1.ScoreName.NUM_REPLIES]: {
                description: "Favour toots with lots of replies",
            },
            [types_1.ScoreName.NUM_RETOOTS]: {
                description: "Favour toots that are retooted a lot",
            },
            [types_1.ScoreName.PARTICIPATED_TAGS]: {
                description: "Favour hastags you've tooted about",
            },
            [types_1.ScoreName.RETOOTED_IN_FEED]: {
                description: "Favour toots retooted by accounts you follow",
            },
            [types_1.ScoreName.TRENDING_LINKS]: {
                description: "Favour links that are trending in the Fediverse",
            },
            [types_1.ScoreName.TRENDING_TAGS]: {
                description: "Favour hashtags that are trending in the Fediverse",
            },
            [types_1.ScoreName.TRENDING_TOOTS]: {
                description: "Favour toots that are trending in the Fediverse",
            },
            [types_1.ScoreName.VIDEO_ATTACHMENTS]: {
                description: "Favour video attachments",
            },
        },
    },
    toots: {
        batchCompleteTootsSleepBetweenMS: 250,
        batchCompleteTootsSize: 25,
        maxAgeInDays: 7,
        maxCachedTimelineToots: 3000,
        saveChangesIntervalSeconds: 30,
        tootsCompleteAfterMinutes: exports.MINUTES_IN_DAY, // Toots younger than this will periodically have their derived fields reevaluated by Toot.completeToot()
    },
    trending: {
        links: {
            numTrendingLinksPerServer: 20, // How many trending links to pull from each server
        },
        tags: {
            invalidTrendingTags: [
                "news",
                "photography",
            ],
            maxToots: 200,
            numDaysToCountTrendingTagData: 3,
            numTootsPerTag: 15,
            numTagsPerServer: 20,
            numTags: 20, // How many trending tags to use after ranking their popularity (seems like values over 19 lead to one stalled search?)
        },
        toots: {
            numTrendingTootsPerServer: 30, // How many trending toots to pull per server // TODO: unused?
        },
    },
};
function setLocale(locale) {
    locale ??= DEFAULT_LOCALE;
    if (!LOCALE_REGEX.test(locale)) {
        console.warn(`Invalid locale "${locale}", using default "${DEFAULT_LOCALE}"`);
        return;
    }
    exports.Config.locale.locale = locale;
    const [language, country] = locale.split("-");
    exports.Config.locale.country = country || DEFAULT_COUNTRY;
    if (language) {
        if (language == DEFAULT_LANGUAGE || language in exports.Config.fediverse.foreignLanguageServers) {
            exports.Config.locale.language = language;
        }
        else {
            console.warn(`Language "${language}" not supported, using default "${exports.Config.locale.defaultLanguage}"`);
        }
    }
}
exports.setLocale = setLocale;
;
// Quick load mode settings
if (environment_helpers_1.isQuickMode) {
    exports.Config.api[types_1.StorageKey.HOME_TIMELINE].initialMaxRecords = 400;
    exports.Config.api[types_1.StorageKey.HOME_TIMELINE].lookbackForUpdatesMinutes = 15;
    exports.Config.api.backgroundLoadIntervalSeconds = exports.SECONDS_IN_HOUR;
    exports.Config.api.maxRecordsForFeatureScoring = 480;
    exports.Config.participatedTags.numTags = 20;
    exports.Config.trending.tags.numTags = 20;
}
// Debug mode settings
if (environment_helpers_1.isDebugMode) {
    exports.Config.api[types_1.StorageKey.NOTIFICATIONS].numMinutesUntilStale = 1;
    exports.Config.api[types_1.StorageKey.RECENT_USER_TOOTS].numMinutesUntilStale = 1;
    exports.Config.api.maxRecordsForFeatureScoring = 20000;
    exports.Config.toots.saveChangesIntervalSeconds = 5;
}
;
// Heavy load test settings
if (environment_helpers_1.isLoadTest) {
    exports.Config.api[types_1.StorageKey.HOME_TIMELINE].initialMaxRecords = 2500;
    exports.Config.toots.maxCachedTimelineToots = 5000;
    exports.Config.api.maxRecordsForFeatureScoring = 1500;
    exports.Config.participatedTags.maxToots = 500;
    exports.Config.participatedTags.numTags = 50;
    exports.Config.participatedTags.numTootsPerTag = 10;
    exports.Config.trending.tags.maxToots = 1000;
    exports.Config.trending.tags.numTags = 40;
}
;
// Validate and set a few derived values in the config
function validateConfig(cfg) {
    // Compute min value for FEDIVERSE_KEYS staleness and store on Config object
    const trendStalenesses = types_1.FEDIVERSE_KEYS.map(k => exports.Config.api[k]?.numMinutesUntilStale);
    exports.Config.api.staleDataTrendingMinutes = Math.min(...trendStalenesses);
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
//# sourceMappingURL=config.js.map