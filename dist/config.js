"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SCORERS_CONFIG = exports.DEFAULT_CONFIG = void 0;
/*
 * Centralized location for non-user configurable settings.
 */
const types_1 = require("./types");
const time_helpers_1 = require("./helpers/time_helpers");
// App level config that is not user configurable
exports.DEFAULT_CONFIG = {
    defaultLanguage: "en",
    defaultRecordsPerPage: 40,
    // Timeline toots
    enableIncrementalLoad: true,
    // incrementalLoadDelayMS: 500,         // Delay between incremental loads of toots
    // maxInitialTimelineToots: 2_500,      // How many standard timeline toots to pull
    incrementalLoadDelayMS: 1000,
    maxCachedTimelineToots: 2500,
    maxInitialTimelineToots: 900,
    maxTimelineHoursToFetch: 168,
    numTootsInFirstFetch: 80,
    numUserTagsToFetchTootsFor: 10,
    scoringBatchSize: 100,
    staleDataDefaultSeconds: 10 * 60,
    staleDataSeconds: {
        [types_1.StorageKey.BLOCKED_ACCOUNTS]: 12 * time_helpers_1.SECONDS_IN_HOUR,
        [types_1.StorageKey.FAVOURITED_ACCOUNTS]: 12 * time_helpers_1.SECONDS_IN_HOUR,
        [types_1.StorageKey.FEDIVERSE_TRENDING_TAGS]: 4 * time_helpers_1.SECONDS_IN_HOUR,
        [types_1.StorageKey.FEDIVERSE_TRENDING_LINKS]: 4 * time_helpers_1.SECONDS_IN_HOUR,
        [types_1.StorageKey.FEDIVERSE_TRENDING_TOOTS]: 4 * time_helpers_1.SECONDS_IN_HOUR,
        [types_1.StorageKey.FOLLOWED_ACCOUNTS]: 4 * time_helpers_1.SECONDS_IN_HOUR,
        [types_1.StorageKey.FOLLOWED_TAGS]: 4 * time_helpers_1.SECONDS_IN_HOUR,
        [types_1.StorageKey.MUTED_ACCOUNTS]: 12 * time_helpers_1.SECONDS_IN_HOUR,
        [types_1.StorageKey.RECENT_NOTIFICATIONS]: 6 * time_helpers_1.SECONDS_IN_HOUR,
        [types_1.StorageKey.RECENT_USER_TOOTS]: 2 * time_helpers_1.SECONDS_IN_HOUR,
        [types_1.StorageKey.POPULAR_SERVERS]: 24 * time_helpers_1.SECONDS_IN_HOUR,
        [types_1.StorageKey.SERVER_SIDE_FILTERS]: 24 * time_helpers_1.SECONDS_IN_HOUR,
        [types_1.StorageKey.TRENDING_TAG_TOOTS]: 0.25 * time_helpers_1.SECONDS_IN_HOUR,
    },
    timelineDecayExponent: 1.2,
    // API stuff
    // backgroundLoadIntervalMS: 25_000, // 30sec
    backgroundLoadIntervalMS: 60000,
    maxRecordsForFeatureScoring: 2800,
    maxFollowingAccountsToPull: 5000,
    minRecordsForFeatureScoring: 240,
    minServerMAU: 100,
    numServersToCheck: 30,
    reloadFeaturesEveryNthOpen: 9,
    timeoutMS: 5000,
    // Trending tags and links
    excessiveTags: 25,
    excessiveTagsPenalty: 0.1,
    numDaysToCountTrendingTagData: 3,
    numTootsPerTrendingTag: 15,
    numTrendingLinksPerServer: 20,
    numTrendingTags: 18,
    numTrendingTagsPerServer: 30,
    numTrendingTagsToots: 250,
    // Trending toots
    numTrendingTootsPerServer: 30,
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
        "mastodon.art",
        "techhub.social",
        "mastodon.sdf.org",
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
        "mstdn.social",
        "threads.net",
    ],
    // Servers that don't support trending links
    noTrendingLinksServers: [
        "chaos.social",
        "fediscience.org",
        "mastodon.cloud",
        "mastodon.gamedev.place",
        "mastodon.sdf.org",
        "med-mastodon.com",
    ],
};
exports.SCORERS_CONFIG = {
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
    [types_1.WeightName.FOLLOWED_TAGS]: {
        description: "Favour toots that contain hashtags you are following",
    },
    [types_1.WeightName.HASHTAG_PARTICIPATION]: {
        description: "Favour hastags you toot about",
    },
    [types_1.WeightName.IMAGE_ATTACHMENTS]: {
        description: "Favour image attachments",
    },
    [types_1.WeightName.INTERACTIONS]: {
        description: "Favour accounts that recently interacted with your toots",
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
};
//# sourceMappingURL=config.js.map