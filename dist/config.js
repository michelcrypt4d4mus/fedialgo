"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = exports.MAX_ENDPOINT_RECORDS_TO_PULL = exports.MIN_RECORDS_FOR_FEATURE_SCORING = exports.SECONDS_IN_WEEK = exports.SECONDS_IN_DAY = exports.SECONDS_IN_HOUR = exports.MINUTES_IN_DAY = exports.MINUTES_IN_HOUR = exports.SECONDS_IN_MINUTE = void 0;
/*
 * Centralized location for non-user configurable settings.
 */
const environment_helpers_1 = require("./helpers/environment_helpers");
const string_helpers_1 = require("./helpers/string_helpers");
const time_helpers_1 = require("./helpers/time_helpers");
const enums_1 = require("./enums");
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
class Config {
    api = {
        // How long to wait between API requests during backgrund load (actually a random number between 0 and this value)
        backgroundLoadSleepBetweenRequestsMS: 1200,
        backgroundLoadIntervalMinutes: 10,
        daysBeforeFullCacheRefresh: 21,
        defaultRecordsPerPage: 40,
        errorMsgs: {
            accessTokenRevoked: "The access token was revoked",
            rateLimitError: "Too many requests",
            rateLimitWarning: "Your Mastodon server is complaining about too many requests coming too quickly. Wait a bit and try again later.",
        },
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
            [enums_1.CacheKey.BLOCKED_DOMAINS]: {
                initialMaxRecords: exports.MAX_ENDPOINT_RECORDS_TO_PULL,
                minutesUntilStale: exports.MINUTES_IN_DAY,
            },
            [enums_1.CacheKey.FAVOURITED_TOOTS]: {
                initialMaxRecords: Math.floor(exports.MIN_RECORDS_FOR_FEATURE_SCORING / 2),
                minutesUntilStale: 12 * exports.MINUTES_IN_HOUR,
            },
            [enums_1.CacheKey.FOLLOWED_ACCOUNTS]: {
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
            [enums_1.CacheKey.HOMESERVER_TOOTS]: {
                initialMaxRecords: 20,
                minutesUntilStale: 10,
            },
            [enums_1.CacheKey.INSTANCE_INFO]: {
                minutesUntilStale: 30 * exports.MINUTES_IN_DAY,
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
            [enums_1.CacheKey.RECENT_USER_TOOTS]: {
                initialMaxRecords: exports.MIN_RECORDS_FOR_FEATURE_SCORING,
                minutesUntilStale: 2 * exports.MINUTES_IN_HOUR,
                supportsMinMaxId: true,
            },
            [enums_1.CacheKey.SERVER_SIDE_FILTERS]: {
                initialMaxRecords: exports.MAX_ENDPOINT_RECORDS_TO_PULL,
                minutesUntilStale: 4 * exports.MINUTES_IN_HOUR,
            },
            [enums_1.FediverseCacheKey.POPULAR_SERVERS]: {
                minutesUntilStale: 5 * exports.MINUTES_IN_DAY,
            },
            [enums_1.FediverseCacheKey.TRENDING_LINKS]: {
                minutesUntilStale: 4 * exports.MINUTES_IN_HOUR,
            },
            [enums_1.FediverseCacheKey.TRENDING_TAGS]: {
                minutesUntilStale: 6 * exports.MINUTES_IN_HOUR,
            },
            [enums_1.FediverseCacheKey.TRENDING_TOOTS]: {
                minutesUntilStale: 4 * exports.MINUTES_IN_HOUR,
            },
            [enums_1.TagTootsCategory.FAVOURITED]: {
                minutesUntilStale: 60,
            },
            [enums_1.TagTootsCategory.PARTICIPATED]: {
                minutesUntilStale: 20,
            },
            [enums_1.TagTootsCategory.TRENDING]: {
                minutesUntilStale: 15,
            },
        },
    };
    favouritedTags = {
        maxParticipations: 3,
        maxToots: 100,
        numTags: 15,
        numTootsPerTag: 5, // How many toots to pull for each tag
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
            "fedibird.com",
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
        messages: {
            [enums_1.LogAction.FINISH_FEED_UPDATE]: `Finalizing scores`,
            [enums_1.LogAction.INITIAL_LOADING_STATUS]: "Ready to load",
            [enums_1.LoadAction.FEED_UPDATE]: (timeline, since) => {
                if (timeline.length == 0) {
                    return `Loading more toots (retrieved ${timeline.length.toLocaleString()} toots so far)`;
                }
                else {
                    return `Loading new toots` + (0, string_helpers_1.optionalSuffix)(since, `since ${(0, time_helpers_1.timeString)(since)}`);
                }
            },
            [enums_1.LoadAction.GET_CONVERSATION]: `Loading conversation`,
            [enums_1.LoadAction.GET_MOAR_DATA]: `Fetching more data for the algorithm`,
            [enums_1.LoadAction.IS_BUSY]: "Load in progress (consider using the setTimelineInApp() callback instead)",
            [enums_1.LoadAction.PULL_ALL_USER_DATA]: `Pulling your historical data`,
            [enums_1.LoadAction.REFRESH_MUTED_ACCOUNTS]: `Refreshing muted accounts`,
            [enums_1.LoadAction.RESET]: `Resetting state`,
            [enums_1.LoadAction.TIMELINE_BACKFILL]: `Loading older home timeline toots`,
        },
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
        maxContentPreviewChars: 110,
        maxTimelineLength: 3000,
        minCharsForLanguageDetect: 8,
        saveChangesIntervalSeconds: 30,
        truncateFullTimelineToLength: 2000,
        tagOnlyStrings: new Set([
            ...enums_1.DAY_NAMES.map(m => m.toLowerCase()),
            ...enums_1.DAYS_SHORT.map(m => m.toLowerCase()),
            ...enums_1.MONTHS.map(m => m.toLowerCase()),
            ...enums_1.MONTHS_SHORT.map(m => m.toLowerCase()),
            "ab",
            "accuracy",
            "act",
            "activity",
            "activitypub",
            "actual",
            "add",
            "administration",
            "age",
            "agency",
            "agent",
            "agents",
            "aggression",
            "ago",
            "alienvault",
            "america",
            "american",
            "americans",
            "americas",
            "am",
            "an",
            "analysis",
            "and",
            "angeles",
            "another",
            "anti",
            "app",
            "apps",
            "are",
            "article",
            "articles",
            "arts",
            "as",
            "ask",
            "asking",
            "attention",
            "aus",
            "author",
            "authority",
            "auto",
            "bad",
            "ba",
            "be",
            "benefit",
            "benefits",
            "bi",
            "big",
            "block",
            "blog",
            "bloomberg",
            "bluesky",
            "body",
            "bot",
            "breach",
            "break",
            "breaking",
            "broken",
            "bsky",
            "business",
            "but",
            "buy",
            "by",
            "bye",
            "ca",
            "call",
            "calls",
            "can",
            "cannot",
            "cat",
            "cats",
            "calendar",
            "center",
            "central",
            "certain",
            "challenge",
            "change",
            "character",
            "choice",
            "choose",
            "circle",
            "citizens",
            "city",
            "classic",
            "co",
            "collaboration",
            "com",
            "come",
            "comment",
            "community",
            "concerns",
            "conflict",
            "conflicts",
            "control",
            "cool",
            "corporate",
            "court",
            "cu",
            "culture",
            "current",
            "customer",
            "customers",
            "daily",
            "das",
            "data",
            "day",
            "de",
            "decision",
            "deep",
            "defence",
            "defense",
            "den",
            "der",
            "design",
            "details",
            "development",
            "did",
            "diego",
            "digital",
            "direct",
            "do",
            "dog",
            "dogs",
            "dollar",
            "dollars",
            "don",
            "donald",
            "down",
            "draw",
            "earth",
            "east",
            "economic",
            "edit",
            "edits",
            "email",
            "en",
            "eight",
            "end",
            "english",
            "episode",
            "era",
            "es",
            "euro",
            "europe",
            "european",
            "euros",
            "event",
            "events",
            "experience",
            "explore",
            "facebook",
            "fair",
            "fall",
            "failure",
            "false",
            "family",
            "feature",
            "featured",
            "federal",
            "feed",
            "fi",
            "fight",
            "financial",
            "fire",
            "fires",
            "first",
            "five",
            "folk",
            "food",
            "for",
            "foreign",
            "forum",
            "found",
            "four",
            "fr",
            "free",
            "french",
            "front",
            "funny",
            "future",
            "garden",
            "gen",
            "gift",
            "globe",
            "global",
            "got",
            "gov",
            "govern",
            "government",
            "growth",
            "guardian",
            "guide",
            "guy",
            "hackernews",
            "had",
            "has",
            "he",
            "head",
            "headline",
            "headlines",
            "health",
            "heat",
            "help",
            "her",
            "here",
            "herself",
            "him",
            "historic",
            "history",
            "his",
            "hit",
            "home",
            "homes",
            "how",
            "http",
            "https",
            "human",
            "id",
            "identity",
            "il",
            "im",
            "in",
            "inc",
            "incident",
            "independent",
            "industry",
            "instagram",
            "instance",
            "interest",
            "international",
            "internet",
            "is",
            "issue",
            "issues",
            "it",
            "ja",
            "je",
            "jp",
            "knew",
            "know",
            "la",
            "lake",
            "landscape",
            "las",
            "late",
            "later",
            "latest",
            "le",
            "lead",
            "leader",
            "leaders",
            "leads",
            "leading",
            "learn",
            "learns",
            "learning",
            "legal",
            "lemonde",
            "les",
            "let",
            "lies",
            "light",
            "link",
            "links",
            "live",
            "lot",
            "local",
            "los",
            "love",
            "loved",
            "loves",
            "mail",
            "man",
            "marketing",
            "mas",
            "mastodon",
            "me",
            "media",
            "medias",
            "medium",
            "meduza",
            "meet",
            "meeting",
            "meetings",
            "member",
            "members",
            "memory",
            "men",
            "met",
            "mine",
            "mode",
            "model",
            "monde",
            "mstdn",
            "mundo",
            "my",
            "net",
            "new",
            "news",
            "nice",
            "night",
            "nine",
            "no",
            "non",
            "north",
            "not",
            "noticias",
            "novel",
            "now",
            "nytimes",
            "oc",
            "of",
            "off",
            "offensive",
            "official",
            "officials",
            "oft",
            "old",
            "on",
            "one",
            "open",
            "opinion",
            "opinions",
            "opt",
            "options",
            "or",
            "org",
            "our",
            "out",
            "overall",
            "own",
            "pa",
            "pace",
            "parts",
            "party",
            "people",
            "per",
            "photo",
            "photos",
            "picture",
            "pictures",
            "pl",
            "planet",
            "platform",
            "plus",
            "point",
            "policy",
            "political",
            "politics",
            "poll",
            "post",
            "posted",
            "pour",
            "power",
            "prediction",
            "president",
            "presidents",
            "press",
            "pro",
            "processing",
            "produce",
            "product",
            "products",
            "promise",
            "promises",
            "public",
            "publicly",
            "put",
            "quality",
            "question",
            "questions",
            "quick",
            "quote",
            "random",
            "report",
            "reports",
            "reserve",
            "resilience",
            "resist",
            "respect",
            "respects",
            "rise",
            "risk",
            "risks",
            "rose",
            "run",
            "running",
            "sa",
            "sad",
            "safety",
            "sale",
            "san",
            "sans",
            "se",
            "season",
            "sell",
            "service",
            "services",
            "set",
            "seven",
            "share",
            "she",
            "short",
            "shorts",
            "show",
            "si",
            "six",
            "social",
            "south",
            "space",
            "spring",
            "star",
            "state",
            "states",
            "stock",
            "strange",
            "strikes",
            "su",
            "substack",
            "success",
            "summer",
            "system",
            "systems",
            "tech",
            "than",
            "the",
            "theguardian",
            "them",
            "themselves",
            "then",
            "their",
            "there",
            "these",
            "they",
            "this",
            "those",
            "threads",
            "three",
            "tie",
            "ties",
            "til",
            "time",
            "times",
            "to",
            "today",
            "too",
            "top",
            "total",
            "track",
            "tracking",
            "trade",
            "trading",
            "travel",
            "trending",
            "truth",
            "tv",
            "two",
            "ua",
            "uk",
            "un",
            "uncertain",
            "uncertainty",
            "unique",
            "united",
            "until",
            "unusual",
            "unusually",
            "up",
            "us",
            "usa",
            "usual",
            "usually",
            "via",
            "video",
            "videos",
            "voice",
            "vs",
            "want",
            "was",
            "water",
            "way",
            "web",
            "website",
            "week",
            "west",
            "what",
            "where",
            "whether",
            "who",
            "why",
            "win",
            "winter",
            "woman",
            "women",
            "worker",
            "workers",
            "world",
            "write",
            "writes",
            "writing",
            "wsj",
            "www",
            "ycombinator",
            "yes",
            "yesterday",
            "yet",
            "yonhapinfomax",
            "you",
            "your",
            "youtube",
            "za",
            "ze",
        ]),
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
    /** Construct a new Config instance, validate it, and logs the validated config. */
    constructor() {
        this.validate(this);
        console.debug(`${LOG_PREFIX} validated:`, this);
    }
    ;
    /**
     * Computes the minimum value of minutesUntilStale for all FediverseCacheKey values.
     * Warns if any required keys are missing a value.
     * @returns {number} The minimum minutes until trending data is considered stale, or 60 if not all keys are configured.
     */
    minTrendingMinutesUntilStale() {
        const trendStalenesses = Object.values(enums_1.FediverseCacheKey)
            .map(k => this.api.data[k]?.minutesUntilStale)
            .filter(Boolean);
        if (trendStalenesses.length != Object.values(enums_1.FediverseCacheKey).length) {
            console.warn(`${LOG_PREFIX} Not all FediverseCacheKey values have minutesUntilStale configured!`);
            return 60;
        }
        else {
            return Math.min(...trendStalenesses);
        }
    }
    /**
     * Sets the locale, language, and country for the application if supported.
     * Falls back to defaults if the locale is invalid or unsupported.
     * @param {string} [locale] - The locale string (e.g., "en-CA").
     */
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
    /**
     * Validates config values for correctness (e.g., checks for NaN or empty strings).
     * Throws an error if invalid values are found.
     * @private
     * @param {ConfigType | object} [cfg] - The config object or sub-object to validate.
     */
    validate(cfg) {
        if (!cfg) {
            if (!this.api.data[enums_1.CacheKey.HOME_TIMELINE_TOOTS]?.lookbackForUpdatesMinutes) {
                throw new Error(`${LOG_PREFIX} HOME_TIMELINE_TOOTS lookbackForUpdatesMinutes is not set!`);
            }
        }
        // Check that all the values are valid
        Object.entries(cfg || this).forEach(([key, value]) => {
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
    config.api.backgroundLoadIntervalMinutes = 2;
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