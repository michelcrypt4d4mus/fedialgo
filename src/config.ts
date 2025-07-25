/*
 * Centralized location for non-user configurable settings.
 */
import { isDebugMode, isLoadTest, isQuickMode } from "./helpers/environment_helpers";
import { optionalSuffix } from "./helpers/string_helpers";
import { timeString } from "./helpers/time_helpers";
import { type NonScoreWeightInfoDict, type Optional } from "./types";
import {
    CacheKey,
    FediverseCacheKey,
    LoadAction,
    LogAction,
    NonScoreWeightName,
    TagTootsCategory,
    DAY_NAMES,
    DAYS_SHORT,
    MONTHS,
    MONTHS_SHORT,
    type ApiCacheKey
} from "./enums";

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
    initialMaxRecords?: number;           // How many records to pull in the initial bootstrap
    canBeDisabledOnGoToSocial?: boolean;  // If true, this endpoint is enabled on GoToSocial servers
    limit?: number;                       // Max per page is usually 40
    lookbackForUpdatesMinutes?: number;   // How long to look back for updates (edits, increased reblogs, etc.)
    maxCacheRecords?: number;
    minutesUntilStale?: number;           // How long until the data is considered stale
    skipCache?: boolean;                  // If true, skip the cache and always make a request
    supportsMinMaxId?: boolean;           // True if the endpoint supports min/maxId
};

type ApiDataConfig = Record<ApiCacheKey, ApiRequestDefaults>;

// See Config object for comments explaining these and other values
interface ApiConfig {
    backgroundLoadIntervalMinutes: number;
    backgroundLoadSleepBetweenRequestsMS: number;
    data: Readonly<ApiDataConfig>;
    daysBeforeFullCacheRefresh: number; // How many days before the cache is considered stale and needs to be refreshed completely
    defaultRecordsPerPage: number;
    errorMsgs: {
        accessTokenRevoked: string;
        goToSocialHashtagTimeline: (s: string) => string;
        rateLimitError: string;
        rateLimitWarning: string;
    };
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

type LoadingStatusMsgs = Omit<Record<LoadAction, string>, LoadAction.FEED_UPDATE>;
type TriggerLoadMsgFxn = {[LoadAction.FEED_UPDATE]: (arr: Array<unknown>, since: Optional<Date>) => string};

type LocaleConfig = {
    country: string;
    defaultLanguage: string;
    language: string;
    locale: string;
    messages: LoadingStatusMsgs & TriggerLoadMsgFxn;  // TRIGGER_FEED_UPDATE is a fxn, everything else is a string
};

interface ParticipatedTagsConfig extends TagTootsConfig {
    minPctToCountRetoots: number;
};

type ScoringConfig = {
    diversityScorerMinTrendingTagTootsForPenalty: number,
    diversityScorerRetootMultiplier: number; // How much to multiply the diversity score of a toot with retweets by
    excessiveTags: number;
    excessiveTagsPenalty: number;
    nonScoreWeightMinValue: number;
    nonScoreWeightsConfig: Readonly<NonScoreWeightInfoDict>;
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
    filterUpdateBatchSize: number; // How many new Toots before calling updateFilterOptions()
    maxAgeInDays: number;
    maxTimelineLength: number;
    minToSkipFilterUpdates: number;
    minCharsForLanguageDetect: number;
    saveChangesIntervalSeconds: number;
    tagOnlyStrings: Set<string>;
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
        // How long to wait between API requests during backgrund load (actually a random number between 0 and this value)
        backgroundLoadSleepBetweenRequestsMS: 1_200,
        backgroundLoadIntervalMinutes: 10,      // Time between background polling for additional user data after initial load
        daysBeforeFullCacheRefresh: 21,         // Days before the cache is considered stale and needs to be refreshed completely  // TODO: currently unused
        defaultRecordsPerPage: 40,              // Max per page is usually 40: https://docs.joinmastodon.org/methods/timelines/#request-2
        errorMsgs: {
            accessTokenRevoked: "The access token was revoked",
            goToSocialHashtagTimeline: (s: string) => `GoToSocial servers don't enable ${s} by default, check if yours does.`,
            rateLimitError: "Too many requests",  // MastoHttpError: Too many requests
            rateLimitWarning: "Your Mastodon server is complaining about too many requests coming too quickly. Wait a bit and try again later.",
        },
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
                canBeDisabledOnGoToSocial: true,
                initialMaxRecords: MAX_ENDPOINT_RECORDS_TO_PULL,
                minutesUntilStale: MINUTES_IN_DAY,
            },
            [CacheKey.FAVOURITED_TOOTS]: {
                initialMaxRecords: Math.floor(MIN_RECORDS_FOR_FEATURE_SCORING / 2),  // Seems to be the biggest bottleneck
                minutesUntilStale: 12 * MINUTES_IN_HOUR,
            },
            [CacheKey.FOLLOWED_ACCOUNTS]: {
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
                canBeDisabledOnGoToSocial: true,
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
            [FediverseCacheKey.POPULAR_SERVERS]: {
                minutesUntilStale: 5 * MINUTES_IN_DAY,
            },
            [FediverseCacheKey.TRENDING_LINKS]: {
                minutesUntilStale: 4 * MINUTES_IN_HOUR,
            },
            [FediverseCacheKey.TRENDING_TAGS]: {
                minutesUntilStale: 6 * MINUTES_IN_HOUR,
            },
            [FediverseCacheKey.TRENDING_TOOTS]: {
                minutesUntilStale: 4 * MINUTES_IN_HOUR,
            },
            [TagTootsCategory.FAVOURITED]: {
                minutesUntilStale: 60,
            },
            [TagTootsCategory.PARTICIPATED]: {
                minutesUntilStale: 20,
            },
            [TagTootsCategory.TRENDING]: {
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
        messages: {                             // FEED_UPDATE is a fxn, everything else is a string
            [LogAction.FINISH_FEED_UPDATE]: `Finalizing scores`,
            [LogAction.INITIAL_LOADING_STATUS]: "Ready to load",
            [LoadAction.FEED_UPDATE]: (timeline: Array<unknown>, since: Optional<Date>) => {
                if (timeline.length == 0) {
                    return `Loading more toots (retrieved ${timeline.length.toLocaleString()} toots so far)`;
                } else {
                    return `Loading new toots` + optionalSuffix(since, `since ${timeString(since)}`);
                }
            },
            [LoadAction.GET_CONVERSATION]: `Loading conversation`,
            [LoadAction.GET_MOAR_DATA]: `Fetching more data for the algorithm`,
            [LoadAction.IS_BUSY]: "Load in progress (consider using the setTimelineInApp() callback instead)",
            [LoadAction.PULL_ALL_USER_DATA]: `Pulling your historical data`,
            [LoadAction.REFRESH_MUTED_ACCOUNTS]: `Refreshing muted accounts`,
            [LoadAction.RESET]: `Resetting state`,
            [LoadAction.TIMELINE_BACKFILL]: `Loading older home timeline toots`,
        },
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
        diversityScorerMinTrendingTagTootsForPenalty: 9,  // Min number of toots w/a trending tag before DiversityFeedScorer applies a penalty
        diversityScorerRetootMultiplier: 4,     // How much to multiply the diversity score of a toot with retweets by
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
        filterUpdateBatchSize: 240,             // How many new Toots before calling updateFilterOptions()
        maxAgeInDays: 7,                        // How long to keep toots in the cache before removing them
        maxContentPreviewChars: 110,            // How many characters to show in a Toot preview
        maxTimelineLength: 3_000,               // Max toots to keep in browser storage. Larger cache doesn't seem to impact performance much
        minCharsForLanguageDetect: 8,           // Min number of characters in a toot before we try to detect its language
        minToSkipFilterUpdates: 300,            // Min timeline toots before we start getting choosy about calling updateFilterOptions()
        saveChangesIntervalSeconds: 30,         // How often to check for updates to toots' numTimesShown
        truncateFullTimelineToLength: 2_000,    // If on startup the timeline is full, truncate it to this length
        tagOnlyStrings: new Set<string>([       // These strings can only be matched as tags, not as content
            ...DAY_NAMES.map(m => m.toLowerCase()),
            ...DAYS_SHORT.map(m => m.toLowerCase()),
            ...MONTHS.map(m => m.toLowerCase()),
            ...MONTHS_SHORT.map(m => m.toLowerCase()),
            "ab",
            "about",
            "accessory",
            "accessories",
            "accident",
            "accidents",
            "account",
            "accountability",
            "accounts",
            "accuracy",
            "achieve",
            "achieved",
            "achieving",
            "across",
            "act",
            "action",
            "actions",
            "activity",
            "activitypub",
            "actu",                // french
            "actual",
            "actualites",          // french
            "add",
            "address",
            "administration",
            "advisory",
            "affect",
            "affected",
            "affecting",
            "affects",
            "after",
            "again",
            "against",
            "age",
            "agency",
            "agent",
            "agents",
            "aggression",
            "ago",
            "agree",
            "agreement",
            "agreements",
            "agrees",
            "agreed",
            "ahead",
            "aid",
            "alienvault",
            "all",
            "also",
            "alt",
            "america",
            "american",
            "americans",
            "americas",
            "am",
            "an",
            "ann",
            "analysis",
            "and",
            "angeles",
            "ano",                // spanish
            "anos",               // spanish
            "another",
            "anti",
            "app",
            "apps",
            "ar",
            "archive",            // archive.org links
            "are",
            "area",
            "areas",
            "arrive",
            "article",
            "articles",
            "arts",
            "as",
            "asp",
            "aspx",             // ASP.NET pages
            "ask",
            "asking",
            "associate",
            "associated",
            "associates",
            "association",
            "at",
            "ate",
            "attention",
            "au",               // Country code for Australia
            "auch",             // German
            "aus",              // German
            "author",
            "authority",
            "auto",
            "avoid",
            "away",
            "bad",
            "ba",
            "bahn",             // German
            "bar",
            "barred",
            "barring",
            "bars",
            "base",
            "based",
            "beat",
            "beats",
            "beautiful",
            "beauty",
            "be",
            "before",
            "belief",
            "beliefs",
            "believe",
            "believed",
            "believes",
            "believing",
            "benefit",
            "benefits",
            "best",
            "bet",
            "bi",
            "big",
            "bigger",
            "biggest",
            "bild",    // German
            "bit",
            "biz",
            "black",
            "block",
            "blog",
            "bloomberg",
            "blue",
            "bluesky",
            "body",
            "boost",
            "boosted",
            "boosting",
            "boosts",
            "bot",
            "both",
            "boy",
            "boys",
            "branch",
            "branches",
            "brand",
            "breach",
            "break",
            "breaking",
            "broken",
            "brown",
            "bsky",
            "build",
            "building",
            "business",
            "but",
            "buy",
            "by",
            "bye",
            "ca",            // TLD
            "call",
            "calls",
            "came",
            "campaign",
            "campaigned",
            "campaigning",
            "campaigns",
            "can",
            "cancel",
            "canceled",
            "cancelled",
            "canceling",
            "cancelling",
            "cancels",
            "cannot",
            "capital",
            "card",
            "care",
            "carry",
            "cat",
            "cats",
            "calendar",
            "center",
            "central",
            "certain",
            "certainly",
            "cesko",          // Czech
            "challenge",
            "change",
            "character",
            "chat",
            "chats",
            "chief",
            "chiefly",
            "choice",
            "choose",
            "circle",
            "citizens",
            "city",
            "claim",
            "claimed",
            "claiming",
            "claims",
            "classic",
            "co",             // TLD
            "cold",
            "collaboration",
            "collection",
            "color",
            "colored",
            "colorful",
            "coloring",
            "colors",
            "com",            // TLD
            "come",
            "comment",
            "commented",
            "commenting",
            "comments",
            "commercial",
            "commission",
            "commissioned",
            "commissions",
            "commit",
            "committed",
            "committing",
            "committee",
            "committees",
            "common",
            "communicate",
            "communicated",
            "communication",
            "communications",
            "community",
            "compact",
            "compacts",
            "companies",
            "company",
            "compliance",
            "complicit",
            "component",
            "components",
            "con",            // spanish
            "concern",
            "concerns",
            "conflict",
            "conflicts",
            "consider",
            "considered",
            "contain",
            "contains",
            "content",
            "contents",
            "contrast",
            "contrasting",
            "contrasts",
            "control",
            "cool",
            "corporate",
            "cost",
            "costs",
            "could",
            "countries",
            "country",
            "cover",
            "coverage",
            "covered",
            "covers",
            "craft",
            "crafts",
            "create",
            "created",
            "creates",
            "creating",
            "creation",
            "creative",
            "critical",
            "cross",
            "cu",             // tagalog
            "cup",
            "cut",
            "culture",
            "current",
            "currently",
            "customer",
            "customers",
            "cz",             // TLD
            "daily",
            "dark",
            "das",            // german
            "data",
            "date",
            "dated",
            "daten",          // german
            "dates",
            "david",
            "day",
            "de",             // german
            "deal",
            "dealing",
            "deals",
            "dear",
            "dearly",
            "decide",
            "decides",
            "decision",
            "decline",
            "declined",
            "declining",
            "deep",
            "defence",
            "defense",
            "degree",
            "deja",          // french
            "deliver",
            "delivered",
            "deliveries",
            "delivering",
            "delivery",
            "dem",           // german
            "den",           // german
            "density",
            "depart",
            "department",
            "departments",
            "der",           // german
            "design",
            "designs",
            "detail",
            "details",
            "development",
            "did",
            "diego",
            "digital",
            "dir",           // german
            "direct",
            "direction",
            "discover",
            "discovered",
            "discovering",
            "discovers",
            "do",
            "dog",
            "dogs",
            "doing",
            "dollar",
            "dollars",
            "don",
            "donald",
            "done",
            "door",
            "doors",
            "dos",           // spanish
            "dot",
            "double",
            "doubled",
            "doubles",
            "doubling",
            "doubt",
            "doubted",
            "doubts",
            "down",
            "draw",
            "drive",
            "driver",
            "drivers",
            "drove",
            "droves",
            "du",           // German
            "each",
            "early",
            "earth",
            "ease",
            "easier",
            "east",
            "eastern",
            "easy",
            "eat",
            "eats",
            "economic",
            "efficiency",
            "efficient",
            "efficiently",
            "effort",
            "efforts",
            "edge",
            "edit",
            "edits",
            "eight",
            "else",
            "email",
            "en",
            "encourage",
            "encouraged",
            "encourages",
            "encouraging",
            "encounter",
            "encountered",
            "encounters",
            "end",
            "ending",
            "ends",
            "engine",
            "english",
            "enjoy",
            "episode",
            "era",
            "er",          // German
            "es",          // Spanish
            "et",          // French
            "ete",         // French
            "essential",
            "est",         // Spanish
            "etc",
            "euro",
            "europe",
            "european",
            "euros",
            "even",
            "event",
            "events",
            "ever",
            "every",
            "everybody",
            "everyone",
            "everything",
            "everywhere",
            "exact",
            "exactly",
            "exchange",
            "exchanged",
            "exchanges",
            "exclusive",
            "exclusively",
            "executive",
            "exist",
            "existed",
            "existing",
            "exists",
            "expect",
            "expected",
            "expecting",
            "expects",
            "experience",
            "expert",
            "experts",
            "expertise",
            "explore",
            "extreme",
            "extremes",
            "face",
            "faced",
            "facebook",
            "faces",
            "facing",
            "fact",
            "factor",
            "factors",
            "facts",
            "fair",
            "fall",
            "failure",
            "false",
            "families",
            "family",
            "feature",
            "featured",
            "features",
            "federal",
            "feed",
            "female",
            "fi",
            "field",
            "fields",
            "fight",
            "file",
            "filed",
            "files",
            "filing",
            "filings",
            "fill",
            "final",
            "finally",
            "financial",
            "find",
            "finds",
            "fine",
            "finish",
            "finished",
            "fire",
            "fires",
            "first",
            "five",
            "floor",
            "floored",
            "floors",
            "focus",
            "focused",
            "focusing",
            "folk",
            "food",
            "for",
            "force",
            "forced",
            "forces",
            "forcing",
            "foreign",
            "form",
            "forum",
            "found",
            "four",
            "fr",        // TLD
            "frank",
            "free",
            "french",
            "from",
            "front",
            "fund",
            "funded",
            "funding",
            "funds",
            "funny",
            "fur",    // German
            "further",
            "furthermore",
            "future",
            "fyi",
            "garden",
            "gear",
            "gearing",
            "gen",
            "general",
            "generally",
            "get",
            "getting",
            "gets",
            "gift",
            "girl",
            "girls",
            "globe",
            "global",
            "go",
            "good",
            "got",
            "gotten",
            "gov",    // TLD
            "govern",
            "government",
            "grad",
            "graphic",
            "great",
            "greater",
            "greatest",
            "green",
            "group",
            "groups",
            "gross",
            "grow",
            "growing",
            "grown",
            "grows",
            "growth",
            "guardian",
            "guide",
            "guy",
            "haber",     // Spanish
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
            "hier",     // German
            "high",
            "him",
            "hip",
            "historic",
            "history",
            "his",
            "hit",
            "home",
            "homes",
            "hot",
            "how",
            "however",
            "hour",
            "hours",
            "houses",
            "htm",
            "html",
            "http",
            "https",
            "human",
            "id",
            "idea",
            "ideal",
            "ideals",
            "ideas",
            "if",
            "identity",
            "il",         // Italian / French
            "im",
            "image",
            "images",
            "impress",
            "impressive",
            "in",
            "inbox",
            "inc",
            "incident",
            "independent",
            "industry",
            "influence",
            "influenced",
            "influencing",
            "info",
            "information",
            "insight",
            "insightful",
            "insights",
            "instagram",
            "instance",
            "interest",
            "international",
            "internet",
            "into",
            "intro",
            "io",             // TLD
            "is",
            "issue",
            "issued",
            "issues",
            "issuing",
            "it",
            "its",
            "itself",
            "ja",             // German
            "je",             // French
            "job",
            "jp",
            "keep",
            "keeps",
            "key",
            "keys",
            "ki",             // Spanish?
            "kind",
            "knew",
            "know",
            "knowing",
            "knowledge",
            "la",             // French
            "lack",
            "lacked",
            "lacking",
            "lacks",
            "lake",
            "landscape",
            "large",
            "larger",
            "largest",
            "las",            // Spanish
            "last",
            "lasts",
            "late",
            "later",
            "latest",
            "lay",
            "lays",
            "le",             // French
            "led",
            "lead",
            "leader",
            "leaders",
            "leading",
            "leads",
            "leak",
            "leaked",
            "leaks",
            "leaking",
            "learn",
            "learns",
            "learning",
            "leave",
            "leaves",
            "leaving",
            "left",
            "legal",
            "lemonde",        // French
            "les",            // French
            "let",
            "lie",
            "lies",
            "life",
            "lifestyle",
            "lifetime",
            "light",
            "like",
            "liked",
            "likes",
            "likely",
            "line",
            "lined",
            "lines",
            "link",
            "links",
            "little",
            "live",
            "lose",
            "loses",
            "losing",
            "loss",
            "lost",
            "lot",
            "local",
            "locally",
            "logic",
            "logical",
            "long",
            "los",
            "love",
            "loved",
            "loves",
            "low",
            "lower",
            "lowest",
            "ma",
            "mad",
            "made",
            "magazine",
            "magazines",
            "mail",
            "main",
            "mainly",
            "make",
            "makes",
            "making",
            "male",
            "man",
            "many",
            "map",
            "maps",
            "mark",
            "marked",
            "marker",
            "marketing",
            "marks",
            "mas",         // Spanish
            "mass",
            "master",
            "mastered",
            "mastodon",
            "may",
            "maybe",
            "me",
            "mean",
            "meaning",
            "meaningful",
            "meaningfully",
            "meaningless",
            "means",
            "meant",
            "media",     // TLD
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
            "message",
            "messages",
            "messaging",
            "met",
            "million",
            "millions",
            "mind",
            "mine",
            "minute",
            "minutes",
            "mode",
            "model",
            "models",
            "modern",
            "monde",      // French
            "more",
            "morning",
            "most",
            "mostly",
            "move",
            "moves",
            "mr",
            "mrs",
            "ms",
            "mstdn",
            "much",
            "mucho",     // Spanish
            "mundo",     // Spanish
            "must",
            "my",
            "nation",
            "national",
            "nationality",
            "nations",
            "natural",
            "ne",         // Spanish
            "near",
            "nearby",
            "nearer",
            "nears",
            "nearly",
            "net",
            "network",
            "networks",
            "new",
            "newer",
            "newest",
            "newly",
            "news",
            "next",
            "nice",
            "niet",       // Dutch
            "nieuws",     // Dutch
            "night",
            "nine",
            "nl",         // TLD
            "no",
            "non",
            "none",
            "nonsense",
            "nope",
            "nor",
            "north",
            "northern",
            "nos",       // French
            "not",
            "note",
            "noted",
            "notes",
            "nothing",
            "notice",
            "noticeable",
            "notices",
            "noticed",
            "noticias",
            "noting",
            "novel",
            "now",
            "nytimes",
            "nz",         // TLD
            "oc",
            "odd",
            "oder",       // German
            "of",
            "off",
            "offensive",
            "office",
            "offices",
            "official",
            "officials",
            "oft",
            "often",
            "oh",
            "ok",
            "okay",
            "old",
            "on",
            "once",
            "one",
            "online",
            "open",
            "opinion",
            "opinions",
            "opt",
            "options",
            "or",
            "org",
            "organisation",
            "organisations",
            "organization",
            "organizations",
            "organized",
            "organizes",
            "origin",
            "origins",
            "original",
            "originals",
            "originally",
            "other",
            "others",
            "our",
            "out",
            "outcome",
            "outcomes",
            "outside",
            "over",
            "overall",
            "own",
            "owner",
            "pa",
            "pace",
            "pack",
            "package",
            "packed",
            "packs",
            "paid",
            "panel",
            "paper",
            "papier",      // French
            "papieros",    // French
            "papiers",     // French
            "park",
            "part",
            "partly",
            "participate",
            "participated",
            "participates",
            "participating",
            "participation",
            "participations",
            "participatory",
            "particular",
            "particularly",
            "parties",
            "partisan",
            "partner",
            "partners",
            "partnership",
            "partnerships",
            "parts",
            "party",
            "pas",        // French
            "pass",
            "passed",
            "past",
            "pat",
            "patch",
            "path",
            "paths",
            "pattern",
            "patterns",
            "pay",
            "pays",
            "people",
            "per",
            "performance",
            "performances",
            "perspective",
            "perspectives",
            "pete",
            "peter",
            "photo",
            "photos",
            "pic",
            "pics",
            "pick",
            "picked",
            "picking",
            "picks",
            "picture",
            "pictures",
            "piece",
            "pixelfed",    // pixelfed.social
            "pl",
            "place",
            "placement",
            "placements",
            "places",
            "placed",
            "plan",
            "plans",
            "planned",
            "planet",
            "plant",
            "planted",
            "platform",
            "play",
            "played",
            "player",
            "players",
            "playing",
            "plays",
            "please",
            "pluralistic",  // TODO: the regex should probably exclude @account mentions...
            "plus",
            "pm",
            "point",
            "pointed",
            "points",
            "pol",
            "policy",
            "political",
            "politics",
            "politik",
            "poll",
            "por",    // Spanish
            "post",
            "posted",
            "pour",
            "power",
            "prediction",
            "president",
            "presidents",
            "press",
            "pretty",
            "prevent",
            "preventable",
            "prevented",
            "preventing",
            "prevents",
            "previous",
            "previously",
            "principle",
            "principles",
            "print",
            "private",
            "pro",
            "problem",
            "problems",
            "probably",
            "processing",
            "produce",
            "product",
            "production",
            "products",
            "progress",
            "progressed",
            "progressing",
            "progression",
            "progressions",
            "project",
            "projects",
            "prominent",
            "promise",
            "promises",
            "promo",
            "promote",
            "promoted",
            "promotes",
            "promoting",
            "promotion",
            "promotions",
            "prompted",
            "prompting",
            "proper",
            "properly",
            "property",
            "protect",
            "protected",
            "protecting",
            "protects",
            "provide",
            "provided",
            "provides",
            "pub",       // TLD
            "public",
            "publicly",
            "pull",
            "pulls",
            "push",
            "pushed",
            "pushes",
            "put",
            "puts",
            "quality",
            "que",    // Spanish
            "question",
            "questioned",
            "questions",
            "quick",
            "quickly",
            "quite",
            "quote",
            "quoted",
            "quotes",
            "quoting",
            "raise",
            "raised",
            "raises",
            "raising",
            "ran",
            "random",
            "range",
            "ranges",
            "rank",
            "ranking",
            "rankings",
            "rate",
            "rates",
            "raw",
            "read",
            "reader",
            "readers",
            "reads",
            "reading",
            "real",
            "reality",
            "realize",
            "realized",
            "realizes",
            "realizing",
            "really",
            "reason",
            "reasoned",
            "reasoning",
            "reasons",
            "receive",
            "received",
            "receives",
            "receiving",
            "recent",
            "recently",
            "record",
            "recorded",
            "recording",
            "recordings",
            "records",
            "recovery",
            "red",
            "redo",
            "reduce",
            "reduced",
            "reduces",
            "reducing",
            "reduction",
            "reductions",
            "region",
            "regions",
            "relate",
            "related",
            "relates",
            "relating",
            "release",
            "released",
            "releases",
            "relevant",
            "reliable",
            "relief",
            "remain",
            "remaining",
            "remains",
            "report",
            "reports",
            "reputation",
            "reputations",
            "require",
            "required",
            "requires",
            "requisite",
            "reserve",
            "resilience",
            "resist",
            "respect",
            "respects",
            "respond",
            "responds",
            "response",
            "responsibilities",
            "responsibility",
            "responsible",
            "responsibly",
            "restore",
            "result",
            "resulted",
            "results",
            "return",
            "returned",
            "returns",
            "reveal",
            "revealed",
            "revealing",
            "reveals",
            "revenue",
            "revenues",
            "review",
            "reviewed",
            "reviewing",
            "reviews",
            "right",
            "rip",
            "ripe",
            "ripped",
            "ripping",
            "rise",
            "risk",
            "risks",
            "ro",         // Romanian TLD
            "road",
            "rocks",
            "room",
            "rooms",
            "rose",
            "rule",
            "ruled",
            "rules",
            "run",
            "running",
            "sa",
            "sad",
            "safety",
            "said",
            "sale",
            "sales",
            "same",
            "san",
            "sans",      // French
            "save",
            "saved",
            "saves",
            "saving",
            "say",
            "says",
            "scene",
            "scenic",
            "scenes",
            "scheme",
            "se",        // Spanish
            "sean",      // Name
            "search",
            "searched",
            "searches",
            "searching",
            "season",
            "second",
            "seconds",
            "section",
            "sections",
            "sector",
            "sectors",
            "security",
            "see",
            "seen",
            "self",
            "sell",
            "send",
            "sense",
            "sent",
            "series",
            "serious",
            "seriously",
            "service",
            "services",
            "set",
            "seven",
            "several",
            "severe",
            "sharp",
            "sharper",
            "shape",
            "share",
            "she",
            "shit",
            "shitty",
            "shittier",
            "short",
            "show",
            "si",     // Spanish
            "side",
            "sides",
            "similar",
            "similarly",
            "simple",
            "simply",
            "since",
            "sit",
            "sits",
            "situation",
            "situations",
            "six",
            "sk",             // TLD
            "slow",
            "slower",
            "slowest",
            "small",
            "smaller",
            "smallest",
            "snap",
            "snaps",
            "snapped",
            "snapping",
            "so",
            "social",
            "society",
            "some",
            "somebody",
            "someone",
            "sometime",
            "solution",
            "solutions",
            "solve",
            "solved",
            "solves",
            "solving",
            "soul",
            "source",
            "sourced",
            "sources",
            "sourcing",
            "south",
            "southern",
            "space",
            "speak",
            "speaking",
            "speaks",
            "special",
            "specific",
            "specifics",
            "specifically",
            "spoke",
            "spring",
            "st",
            "stand",
            "standing",
            "stands",
            "standard",
            "standards",
            "star",
            "stars",
            "start",
            "started",
            "starts",
            "state",
            "states",
            "stem",
            "stemmed",
            "stemming",
            "stems",
            "steve",
            "still",
            "stock",
            "stood",
            "stop",
            "stopped",
            "stopping",
            "stops",
            "stories",
            "story",
            "strange",
            "strategies",
            "strategy",
            "street",
            "strikes",
            "strong",
            "study",
            "studying",
            "studied",
            "studies",
            "stuff",
            "sturm",        // German
            "style",
            "styles",
            "subject",
            "subjects",
            "subj",         // German
            "su",
            "substack",
            "such",
            "success",
            "sudden",
            "suddenly",
            "summer",
            "supplied",
            "supplier",
            "suppliers",
            "supplies",
            "supply",
            "support",
            "sure",
            "system",
            "systems",
            "take",
            "takes",
            "taken",
            "takeover",
            "takeovers",
            "taking",
            "talk",
            "talked",
            "talking",
            "talks",
            "tall",
            "taller",
            "tap",
            "tapped",
            "tapping",
            "taps",
            "task",
            "team",
            "teamed",
            "teaming",
            "teams",
            "tech",
            "template",
            "ten",
            "tend",
            "tends",
            "text",
            "than",
            "thank",
            "thanks",
            "that",
            "the",
            "theguardian",
            "them",
            "themselves",
            "then",
            "their",
            "there",
            "these",
            "they",
            "think",
            "thinks",
            "this",
            "those",
            "thought",
            "thoughts",
            "thousand",
            "thousands",
            "threads",
            "three",
            "through",
            "throughout",
            "ticket",
            "tie",
            "ties",
            "til",
            "tim",
            "time",
            "times",
            "tiny",
            "tip",
            "tipped",
            "tipping",
            "tips",
            "title",
            "titled",
            "titles",
            "to",
            "today",
            "together",
            "ton",
            "tonne",
            "tonnes",
            "tons",
            "too",
            "tool",
            "tools",
            "top",
            "total",
            "tough",
            "tougher",
            "toughest",
            "town",
            "track",
            "tracking",
            "trade",
            "trading",
            "tradition",
            "traditional",
            "traditions",
            "train",
            "training",
            "transfer",
            "transferred",
            "transferring",
            "transfers",
            "transport",
            "transported",
            "transporting",
            "transports",
            "travel",
            "treat",
            "treats",
            "trending",
            "trip",
            "true",
            "trust",
            "trusted",
            "trusts",
            "truth",
            "turn",
            "turned",
            "turning",
            "turns",
            "tv",
            "two",
            "ua",
            "uk",
            "un",
            "uncertain",
            "uncertainty",
            "und",     // German
            "under",
            "understand",
            "understanding",
            "understands",
            "understood",
            "unfinished",
            "unique",
            "united",
            "unity",
            "uns",     // German
            "until",
            "unusual",
            "unusually",
            "up",
            "update",
            "updates",
            "upon",
            "us",
            "usa",
            "use",
            "used",
            "user",
            "users",
            "uses",
            "using",
            "usual",
            "usually",
            "valley",
            "valleys",
            "varieties",
            "variety",
            "various",
            "variously",
            "ve",          // French
            "ver",         // German
            "verified",
            "verify",
            "version",
            "versions",
            "very",
            "via",
            "victim",
            "video",
            "videos",
            "view",
            "views",
            "viewed",
            "voice",
            "vs",
            "wahrun",        // German
            "wait",
            "waiting",
            "waits",
            "want",
            "wants",
            "was",
            "washingtonpost",
            "waste",
            "wasted",
            "watch",
            "watched",
            "watching",
            "water",
            "wave",
            "waved",
            "waver",
            "waves",
            "way",
            "we",
            "wear",
            "wears",
            "web",
            "website",
            "week",
            "weigh",
            "weighing",
            "weird",
            "weirder",
            "weirdest",
            "weirdly",
            "weirdness",
            "well",
            "wenn",          // German
            "went",
            "were",
            "west",
            "western",
            "wetter",        // German
            "what",
            "when",
            "where",
            "whether",
            "which",
            "while",
            "white",
            "who",
            "whole",
            "whom",
            "whose",
            "why",
            "wide",
            "wider",
            "widest",
            "wild",
            "will",
            "willing",
            "win",
            "winter",
            "wird",    // German
            "with",
            "within",
            "without",
            "woman",
            "women",
            "wonder",
            "wondered",
            "wondering",
            "wonders",
            "word",
            "wording",
            "words",
            "wore",
            "work",
            "worked",
            "worker",
            "workers",
            "working",
            "world",
            "would",
            "wow",
            "write",
            "writes",
            "writing",
            "wrong",
            "wsj",
            "www",
            "ycombinator",
            "ya",
            "yea",
            "yeah",
            "year",
            "years",
            "yeh",
            "yellow",
            "yep",
            "yes",
            "yesterday",
            "yet",
            "yo",
            "yonhapinfomax",
            "you",
            "young",
            "younger",
            "youngest",
            "your",
            "yourself",
            "yourselves",
            "youtube",
            "za",      // South Africa TLD
            "ze",
            "zu",      // German
        ]),
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
     * Computes the minimum value of minutesUntilStale for all FediverseCacheKey values.
     * Warns if any required keys are missing a value.
     * @returns {number} The minimum minutes until trending data is considered stale, or 60 if not all keys are configured.
     */
    minTrendingMinutesUntilStale(): number {
        const trendStalenesses = Object.values(FediverseCacheKey)
                                       .map(k => this.api.data[k]?.minutesUntilStale)
                                       .filter(Boolean);

        if (trendStalenesses.length != Object.values(FediverseCacheKey).length) {
            console.warn(`${LOG_PREFIX} Not all FediverseCacheKey values have minutesUntilStale configured!`);
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
    config.toots.maxTimelineLength = 1_500;
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
