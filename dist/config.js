"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SCORERS_CONFIG = exports.DEFAULT_CONFIG = void 0;
/*
 * Centralized location for non-user configurable settings.
 */
const types_1 = require("./types");
// App level config that is not user configurable
exports.DEFAULT_CONFIG = {
    defaultLanguage: "en",
    defaultRecordsPerPage: 40,
    maxNumCachedToots: 2500,
    // Timeline toots
    enableIncrementalLoad: true,
    // incrementalLoadDelayMS: 500,         // Delay between incremental loads of toots
    // maxTimelineTootsToFetch: 2_500,      // How many standard timeline toots to pull
    incrementalLoadDelayMS: 1000,
    maxTimelineTootsToFetch: 900,
    maxTimelineHoursToFetch: 168,
    numTootsInFirstFetch: 80,
    scoringBatchSize: 100,
    staleDataSeconds: 10 * 60,
    timelineDecayExponent: 1.2,
    // API stuff
    maxFollowingAccountsToPull: 5000,
    minRecordsForFeatureScoring: 400,
    minServerMAU: 100,
    numServersToCheck: 30,
    reloadFeaturesEveryNthOpen: 9,
    timeoutMS: 5000,
    // Trending tags
    excessiveTags: 25,
    numDaysToCountTrendingTagData: 3,
    numTootsPerTrendingTag: 20,
    numTrendingLinksPerServer: 20,
    numTrendingTags: 18,
    numTrendingTagsPerServer: 30,
    numTrendingTagsToots: 100,
    // Trending toots
    numTrendingTootsPerServer: 30,
    // Popular servers that are used as fallbacks if the user isn't following accounts on enough
    // servers to make for a good set of trending toots and hashtags.
    // Culled from https://mastodonservers.net and https://joinmastodon.org/
    defaultServers: [
        "mastodon.social",
        // "pawoo.net",       // Japanese (and maybe NSFW?)
        // "baraag.net",      // very NSFW
        // "mstdn.jp",        // Japanese
        "mastodon.cloud",
        // "pravda.me"        // Russian
        // "mstdn.social",    // Slow, blocked by CORS
        "mastodon.online",
        "mas.to",
        "mastodon.world",
        // "mastodon.lol",               // Doesn't return MAU data
        "c.im",
        "hachyderm.io",
        // "fosstodon.org",              // Doesn't support trending links/toots
        "universeodon.com",
        "infosec.exchange",
        "mastodon.gamedev.place",
        "mastodonapp.uk",
        // "mastodon.technology",        // Doesn't return MAU data
        "ioc.exchange",
        "mastodon.art",
        "techhub.social",
        // "mathstodon.xyz",             // Doesn't return MAU data
        "mastodon.sdf.org",
        "defcon.social",
        "mstdn.party",
        "sfba.social",
        "toot.community",
        "ravenation.club",
        "sciences.social",
        "toot.io",
    ],
    // Non-mastodon servers and/or servers that don't make the MAU data available publicly
    noMauServers: [
        "agora.echelon.pl",
        "bsky.brid.gy",
        "fediverse.one",
        "flipboard.com",
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