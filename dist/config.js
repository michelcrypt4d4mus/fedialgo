"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildNewFilterSettings = exports.DEFAULT_CONFIG = exports.DEFAULT_FILTERS = exports.DEFAULT_WEIGHTS = void 0;
/*
 * Centralized location for non-user configurable settings.
 */
const numeric_filter_1 = __importStar(require("./filters/numeric_filter"));
const property_filter_1 = __importStar(require("./filters/property_filter"));
const types_1 = require("./types");
exports.DEFAULT_WEIGHTS = {
    // Global modifiers that affect all weighted scores
    [types_1.WeightName.TIME_DECAY]: {
        defaultWeight: 0.05,
        description: "Higher values favour recent toots more",
        minValue: 0.001,
    },
    [types_1.WeightName.TRENDING]: {
        defaultWeight: 0.06,
        minValue: 0.001,
        description: "Multiplier applied to trending toots, tags, and links",
    },
    // Weighted scores
    [types_1.WeightName.CHAOS]: {
        defaultWeight: 1,
        description: "Insert Chaos into the scoring (social media ist krieg)",
    },
    [types_1.WeightName.DIVERSITY]: {
        defaultWeight: 1,
        description: "Disfavour accounts that are tooting a lot right now",
    },
    [types_1.WeightName.FAVORITED_ACCOUNTS]: {
        defaultWeight: 1,
        description: "Favour accounts you often favourite",
    },
    [types_1.WeightName.FOLLOWED_TAGS]: {
        defaultWeight: 2.0,
        description: "Favour toots that contain hashtags you are following",
    },
    [types_1.WeightName.IMAGE_ATTACHMENTS]: {
        defaultWeight: 0,
        description: "Favour image attachments",
    },
    [types_1.WeightName.INTERACTIONS]: {
        defaultWeight: 1.5,
        description: "Favour accounts that recently interacted with your toots",
    },
    [types_1.WeightName.MENTIONS_FOLLOWED]: {
        defaultWeight: 2.0,
        description: "Favour toots that mention accounts you follow",
    },
    [types_1.WeightName.MOST_REPLIED_ACCOUNTS]: {
        defaultWeight: 1,
        description: "Favour accounts you often reply to",
    },
    [types_1.WeightName.MOST_RETOOTED_ACCOUNTS]: {
        defaultWeight: 2,
        description: "Favour accounts you often retoot",
    },
    [types_1.WeightName.NUM_FAVOURITES]: {
        defaultWeight: 1,
        description: "Favour things favourited by users on your home server",
    },
    [types_1.WeightName.NUM_REPLIES]: {
        defaultWeight: 1,
        description: "Favour toots with lots of replies",
    },
    [types_1.WeightName.NUM_RETOOTS]: {
        defaultWeight: 1,
        description: "Favour toots that are retooted a lot",
    },
    [types_1.WeightName.RETOOTED_IN_FEED]: {
        defaultWeight: 2.0,
        description: "Favour toots retooted by multiple accounts you follow",
    },
    [types_1.WeightName.TRENDING_LINKS]: {
        defaultWeight: 0.7,
        description: "Favour links that are trending in the Fediverse",
    },
    [types_1.WeightName.TRENDING_TAGS]: {
        defaultWeight: 0.5,
        description: "Favour hashtags that are trending in the Fediverse",
    },
    [types_1.WeightName.TRENDING_TOOTS]: {
        defaultWeight: 1.0,
        description: "Favour toots that are trending in the Fediverse",
    },
    [types_1.WeightName.VIDEO_ATTACHMENTS]: {
        defaultWeight: 0,
        description: "Favour video attachments",
    },
};
exports.DEFAULT_FILTERS = {
    feedFilterSectionArgs: [],
    filterSections: {},
    numericFilterArgs: [],
    numericFilters: {},
};
// App level config that is not user configurable
exports.DEFAULT_CONFIG = {
    defaultLanguage: "en",
    defaultRecordsPerPage: 40,
    maxNumCachedToots: 5000,
    // Timeline toots
    enableIncrementalLoad: true,
    // incrementalLoadDelayMS: 500,         // Delay between incremental loads of toots
    // maxTimelineTootsToFetch: 2_500,      // How many standard timeline toots to pull
    incrementalLoadDelayMS: 2500,
    maxTimelineTootsToFetch: 800,
    maxTimelineHoursToFetch: 168,
    numTootsInFirstFetch: 80,
    // API stuff
    maxFollowingAccountsToPull: 5000,
    minRecordsForFeatureScoring: 400,
    minServerMAU: 100,
    numServersToCheck: 30,
    reloadFeaturesEveryNthOpen: 9,
    // Trending tags
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
        // "pawoo.net",   // Japanese (and maybe NSFW?)
        // "baraag.net",  // very NSFW
        // "mstdn.jp",    // Japanese
        "mastodon.cloud",
        // "pravda.me"    // Russian
        "mstdn.social",
        "mastodon.online",
        "mas.to",
        "mastodon.world",
        // "mastodon.lol",               // Doesn't return MAU data
        "c.im",
        "hachyderm.io",
        "fosstodon.org",
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
        "fediverse.one",
        "flipboard.com",
        'mathstodon.xyz',
        "threads.net",
    ],
};
// Build a new FeedFilterSettings object with DEFAULT_FILTERS as the base.
// Start with numeric & type filters. Other PropertyFilters depend on what's in the toots.
function buildNewFilterSettings() {
    const filters = JSON.parse(JSON.stringify(exports.DEFAULT_FILTERS));
    filters.filterSections[property_filter_1.PropertyName.TYPE] = new property_filter_1.default({ title: property_filter_1.PropertyName.TYPE });
    numeric_filter_1.FILTERABLE_SCORES.forEach(f => filters.numericFilters[f] = new numeric_filter_1.default({ title: f }));
    // console.debug(`Built new FeedFilterSettings:`, filters);
    return filters;
}
exports.buildNewFilterSettings = buildNewFilterSettings;
;
//# sourceMappingURL=config.js.map