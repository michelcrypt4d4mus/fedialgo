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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.timeString = exports.sortKeysByValue = exports.optionalSuffix = exports.makePercentileChunks = exports.makeChunks = exports.isValueInStringEnum = exports.isAccessTokenRevokedError = exports.extractDomain = exports.TypeFilterName = exports.TrendingType = exports.TagTootsCacheKey = exports.ScoreName = exports.NonScoreWeightName = exports.MediaCategory = exports.BooleanFilterName = exports.Toot = exports.TagList = exports.ObjWithCountList = exports.NumericFilter = exports.Logger = exports.BooleanFilter = exports.Account = exports.VIDEO_TYPES = exports.READY_TO_LOAD_MSG = exports.GIFV = exports.GET_FEED_BUSY_MSG = exports.FEDIALGO = exports.FILTER_OPTION_DATA_SOURCES = void 0;
/*
 * Main class that handles scoring and sorting a feed made of Toot objects.
 */
require("reflect-metadata"); // Required for class-transformer
const async_mutex_1 = require("async-mutex");
const account_1 = __importDefault(require("./api/objects/account"));
exports.Account = account_1.default;
const already_shown_scorer_1 = __importDefault(require("./scorer/toot/already_shown_scorer"));
const author_followers_scorer_1 = __importDefault(require("./scorer/toot/author_followers_scorer"));
const boolean_filter_1 = __importDefault(require("./filters/boolean_filter"));
exports.BooleanFilter = boolean_filter_1.default;
const chaos_scorer_1 = __importDefault(require("./scorer/toot/chaos_scorer"));
const diversity_feed_scorer_1 = __importDefault(require("./scorer/feed/diversity_feed_scorer"));
const favourited_tags_scorer_1 = __importDefault(require("./scorer/toot/favourited_tags_scorer"));
const followed_accounts_scorer_1 = __importDefault(require("./scorer/toot/followed_accounts_scorer"));
const followed_tags_scorer_1 = __importDefault(require("./scorer/toot/followed_tags_scorer"));
const followers_scorer_1 = __importDefault(require("./scorer/toot/followers_scorer"));
const hashtag_participation_scorer_1 = __importDefault(require("./scorer/toot/hashtag_participation_scorer"));
const image_attachment_scorer_1 = __importDefault(require("./scorer/toot/image_attachment_scorer"));
const interactions_scorer_1 = __importDefault(require("./scorer/toot/interactions_scorer"));
const api_1 = __importStar(require("./api/api"));
Object.defineProperty(exports, "isAccessTokenRevokedError", { enumerable: true, get: function () { return api_1.isAccessTokenRevokedError; } });
const mastodon_server_1 = __importDefault(require("./api/mastodon_server"));
const mentions_followed_scorer_1 = __importDefault(require("./scorer/toot/mentions_followed_scorer"));
const most_favourited_accounts_scorer_1 = __importDefault(require("./scorer/toot/most_favourited_accounts_scorer"));
const most_replied_accounts_scorer_1 = __importDefault(require("./scorer/toot/most_replied_accounts_scorer"));
const most_retooted_accounts_scorer_1 = __importDefault(require("./scorer/toot/most_retooted_accounts_scorer"));
const numeric_filter_1 = __importDefault(require("./filters/numeric_filter"));
exports.NumericFilter = numeric_filter_1.default;
const num_favourites_scorer_1 = __importDefault(require("./scorer/toot/num_favourites_scorer"));
const num_replies_scorer_1 = __importDefault(require("./scorer/toot/num_replies_scorer"));
const num_retoots_scorer_1 = __importDefault(require("./scorer/toot/num_retoots_scorer"));
const obj_with_counts_list_1 = __importDefault(require("./api/obj_with_counts_list"));
exports.ObjWithCountList = obj_with_counts_list_1.default;
const retoots_in_feed_scorer_1 = __importDefault(require("./scorer/toot/retoots_in_feed_scorer"));
const scorer_1 = __importDefault(require("./scorer/scorer"));
const scorer_cache_1 = __importDefault(require("./scorer/scorer_cache"));
const Storage_1 = __importDefault(require("./Storage"));
const tag_list_1 = __importDefault(require("./api/tag_list"));
exports.TagList = tag_list_1.default;
const toot_1 = __importStar(require("./api/objects/toot"));
exports.Toot = toot_1.default;
const tags_for_fetching_toots_1 = __importDefault(require("./api/tags_for_fetching_toots"));
const trending_links_scorer_1 = __importDefault(require("./scorer/toot/trending_links_scorer"));
const trending_tags_scorer_1 = __importDefault(require("./scorer/toot/trending_tags_scorer"));
const trending_toots_scorer_1 = __importDefault(require("./scorer/toot/trending_toots_scorer"));
const user_data_1 = __importDefault(require("./api/user_data"));
const video_attachment_scorer_1 = __importDefault(require("./scorer/toot/video_attachment_scorer"));
const time_helpers_1 = require("./helpers/time_helpers");
Object.defineProperty(exports, "timeString", { enumerable: true, get: function () { return time_helpers_1.timeString; } });
const feed_filters_1 = require("./filters/feed_filters");
const config_1 = require("./config");
const string_helpers_1 = require("./helpers/string_helpers");
Object.defineProperty(exports, "FEDIALGO", { enumerable: true, get: function () { return string_helpers_1.FEDIALGO; } });
Object.defineProperty(exports, "GIFV", { enumerable: true, get: function () { return string_helpers_1.GIFV; } });
Object.defineProperty(exports, "VIDEO_TYPES", { enumerable: true, get: function () { return string_helpers_1.VIDEO_TYPES; } });
Object.defineProperty(exports, "extractDomain", { enumerable: true, get: function () { return string_helpers_1.extractDomain; } });
Object.defineProperty(exports, "optionalSuffix", { enumerable: true, get: function () { return string_helpers_1.optionalSuffix; } });
const types_1 = require("./types");
Object.defineProperty(exports, "FILTER_OPTION_DATA_SOURCES", { enumerable: true, get: function () { return types_1.FILTER_OPTION_DATA_SOURCES; } });
const moar_data_poller_1 = require("./api/moar_data_poller");
const environment_helpers_1 = require("./helpers/environment_helpers");
const weight_presets_1 = require("./scorer/weight_presets");
const log_helpers_1 = require("./helpers/log_helpers");
const logger_1 = require("./helpers/logger");
Object.defineProperty(exports, "Logger", { enumerable: true, get: function () { return logger_1.Logger; } });
const stats_helper_1 = require("./helpers/stats_helper");
const enums_1 = require("./enums");
Object.defineProperty(exports, "BooleanFilterName", { enumerable: true, get: function () { return enums_1.BooleanFilterName; } });
Object.defineProperty(exports, "MediaCategory", { enumerable: true, get: function () { return enums_1.MediaCategory; } });
Object.defineProperty(exports, "NonScoreWeightName", { enumerable: true, get: function () { return enums_1.NonScoreWeightName; } });
Object.defineProperty(exports, "ScoreName", { enumerable: true, get: function () { return enums_1.ScoreName; } });
Object.defineProperty(exports, "TrendingType", { enumerable: true, get: function () { return enums_1.TrendingType; } });
Object.defineProperty(exports, "TypeFilterName", { enumerable: true, get: function () { return enums_1.TypeFilterName; } });
Object.defineProperty(exports, "TagTootsCacheKey", { enumerable: true, get: function () { return enums_1.TagTootsCacheKey; } });
Object.defineProperty(exports, "isValueInStringEnum", { enumerable: true, get: function () { return enums_1.isValueInStringEnum; } });
const collection_helpers_1 = require("./helpers/collection_helpers");
Object.defineProperty(exports, "makeChunks", { enumerable: true, get: function () { return collection_helpers_1.makeChunks; } });
Object.defineProperty(exports, "makePercentileChunks", { enumerable: true, get: function () { return collection_helpers_1.makePercentileChunks; } });
Object.defineProperty(exports, "sortKeysByValue", { enumerable: true, get: function () { return collection_helpers_1.sortKeysByValue; } });
const FINALIZING_SCORES_MSG = `Finalizing scores`;
const GET_FEED_BUSY_MSG = `Load in progress (consider using the setTimelineInApp() callback instead)`;
exports.GET_FEED_BUSY_MSG = GET_FEED_BUSY_MSG;
const INITIAL_LOAD_STATUS = "Retrieving initial data";
const PULLING_USER_HISTORY = `Pulling your historical data`;
const READY_TO_LOAD_MSG = "Ready to load";
exports.READY_TO_LOAD_MSG = READY_TO_LOAD_MSG;
const DEFAULT_SET_TIMELINE_IN_APP = (_feed) => console.debug(`Default setTimelineInApp() called`);
const EMPTY_TRENDING_DATA = {
    links: [],
    tags: new tag_list_1.default([], enums_1.TagTootsCacheKey.TRENDING_TAG_TOOTS),
    servers: {},
    toots: []
};
var LogPrefix;
(function (LogPrefix) {
    LogPrefix["FINISH_FEED_UPDATE"] = "finishFeedUpdate";
    LogPrefix["REFRESH_MUTED_ACCOUNTS"] = "refreshMutedAccounts";
    LogPrefix["SET_LOADING_STATUS"] = "setLoadingStateVariables";
    LogPrefix["TRIGGER_FEED_UPDATE"] = "triggerFeedUpdate";
    LogPrefix["TRIGGER_PULL_ALL_USER_DATA"] = "triggerPullAllUserData";
    LogPrefix["TRIGGER_TIMELINE_BACKFILL"] = "triggerTimelineBackfill";
})(LogPrefix || (LogPrefix = {}));
;
const logger = new logger_1.Logger(`TheAlgorithm`);
const loggers = (0, enums_1.buildCacheKeyDict)((key) => new logger_1.Logger(key));
Object.values(LogPrefix).forEach((prefix) => loggers[prefix] = logger.tempLogger(prefix));
;
/**
 * Main class for scoring, sorting, and managing a Mastodon feed made of Toot objects.
 *
 * TheAlgorithm orchestrates fetching, scoring, filtering, and updating the user's timeline/feed.
 * It manages feature and feed scorers, trending data, filters, user weights, and background polling.
 *
 * Key responsibilities:
 * - Fetches and merges toots from multiple sources (home timeline, trending, hashtags, etc.)
 * - Applies scoring algorithms and user-defined weights to rank toots
 * - Filters the feed based on user settings and filter options
 * - Handles background polling for new data and saving state to storage
 * - Provides methods for updating filters, weights, and retrieving current state
 * - Exposes utility methods for stats, server info, and tag URLs
 *
 * @property {string[]} apiErrorMsgs - API error messages
 * @property {FeedFilterSettings} filters - Current filter settings for the feed
 * @property {boolean} isLoading - Whether a feed load is in progress*
 * @property {number} [lastLoadTimeInSeconds] - Duration of the last load in seconds
 * @property {string | null} loadingStatus - String describing load activity
 * @property {Toot[]} timeline - The current filtered timeline
 * @property {TrendingData} trendingData - Trending data (links, tags, servers, toots)
 * @property {UserData} userData - User data for scoring and filtering
 * @property {WeightInfoDict} weightsInfo - Info about all scoring weights
 */
class TheAlgorithm {
    /**
     * True if FEDIALGO_DEBUG environment var was set at compile time.
     * @returns {boolean}
     */
    static get isDebugMode() { return environment_helpers_1.isDebugMode; }
    ;
    /**
     * Dictionary of preset weight configurations for scoring.
     * @returns {WeightPresets}
     */
    static get weightPresets() { return weight_presets_1.WEIGHT_PRESETS; }
    ;
    filters = (0, feed_filters_1.buildNewFilterSettings)();
    lastLoadTimeInSeconds;
    loadingStatus = READY_TO_LOAD_MSG;
    trendingData = EMPTY_TRENDING_DATA;
    get apiErrorMsgs() { return api_1.default.instance.apiErrors.map(e => e.message); }
    ;
    // TODO: Using loadingStatus as the marker for loading state is a bit (or a lot) janky.
    get isLoading() { return !!(this.loadingStatus && this.loadingStatus != READY_TO_LOAD_MSG); }
    ;
    get timeline() { return [...this.feed]; }
    ;
    get userData() { return api_1.default.instance.userData || new user_data_1.default(); }
    ;
    // Constructor argument variables
    api;
    user;
    setTimelineInApp; // Optional callback to set the feed in the app using this package
    // Other private variables
    feed = [];
    homeFeed = []; // Just the toots pulled from the home timeline
    hasProvidedAnyTootsToClient = false; // Flag to indicate if the feed has been set in the app
    loadStartedAt = null; // Timestamp of when the feed started loading
    totalNumTimesShown = 0; // Sum of timeline toots' numTimesShown
    // Utility
    loadingMutex = new async_mutex_1.Mutex();
    mergeMutex = new async_mutex_1.Mutex();
    numTriggers = 0; // How many times has a load been triggered, only matters for QUICK_LOAD mode
    // Background tasks
    cacheUpdater;
    dataPoller;
    // These scorers require the complete feed to work properly
    feedScorers = [
        new diversity_feed_scorer_1.default(),
    ];
    // These can score a toot without knowing about the rest of the toots in the feed
    tootScorers = [
        new already_shown_scorer_1.default(),
        new author_followers_scorer_1.default(),
        new chaos_scorer_1.default(),
        new favourited_tags_scorer_1.default(),
        new followed_accounts_scorer_1.default(),
        new followed_tags_scorer_1.default(),
        new followers_scorer_1.default(),
        new hashtag_participation_scorer_1.default(),
        new image_attachment_scorer_1.default(),
        new interactions_scorer_1.default(),
        new mentions_followed_scorer_1.default(),
        new most_favourited_accounts_scorer_1.default(),
        new most_replied_accounts_scorer_1.default(),
        new most_retooted_accounts_scorer_1.default(),
        new num_favourites_scorer_1.default(),
        new num_replies_scorer_1.default(),
        new num_retoots_scorer_1.default(),
        new retoots_in_feed_scorer_1.default(),
        new trending_links_scorer_1.default(),
        new trending_tags_scorer_1.default(),
        new trending_toots_scorer_1.default(),
        new video_attachment_scorer_1.default(),
    ];
    weightedScorers = [
        ...this.tootScorers,
        ...this.feedScorers,
    ];
    weightsInfo = this.weightedScorers.reduce((scorerInfos, scorer) => {
        scorerInfos[scorer.name] = scorer.getInfo();
        return scorerInfos;
    }, Object.values(enums_1.NonScoreWeightName).reduce((nonScoreWeights, weightName) => {
        nonScoreWeights[weightName] = Object.assign({}, config_1.config.scoring.nonScoreWeightsConfig[weightName]);
        nonScoreWeights[weightName].minValue = config_1.config.scoring.nonScoreWeightMinValue;
        return nonScoreWeights;
    }, {}));
    /**
     * Publicly callable constructor that instantiates the class and loads the feed from storage.
     * @param {AlgorithmArgs} params - The parameters for algorithm creation.
     * @param {mastodon.rest.Client} params.api - The Mastodon REST API client instance.
     * @param {mastodon.v1.Account} params.user - The Mastodon user account for which to build the feed.
     * @param {string} [params.locale] - Optional locale string for date formatting.
     * @param {(feed: Toot[]) => void} [params.setTimelineInApp] - Optional callback to set the feed in the consuming app.
     * @returns {Promise<TheAlgorithm>} TheAlgorithm instance.
     */
    static async create(params) {
        config_1.config.setLocale(params.locale);
        const user = account_1.default.build(params.user);
        await api_1.default.init(params.api, user);
        await Storage_1.default.logAppOpen(user);
        // Construct the algorithm object, set the default weights, load feed and filters
        const algo = new TheAlgorithm({ ...params, user });
        scorer_cache_1.default.addScorers(algo.tootScorers, algo.feedScorers);
        await algo.loadCachedData();
        return algo;
    }
    /**
     * Private constructor for TheAlgorithm. Use TheAlgorithm.create() to instantiate.
     * @param {AlgorithmArgs} params - Constructor params (API client, user, and optional timeline callback/locale).
     */
    constructor(params) {
        this.api = params.api;
        this.user = params.user;
        this.setTimelineInApp = params.setTimelineInApp ?? DEFAULT_SET_TIMELINE_IN_APP;
    }
    /**
     * Trigger the retrieval of the user's timeline from all the sources.
     * @param {boolean} [moreOldToots] - Backfill older toots instead of getting new toots
     * @returns {Promise<void>}
     */
    async triggerFeedUpdate() {
        loggers[LogPrefix.TRIGGER_FEED_UPDATE].info(`${++this.numTriggers} triggers so far, state:`, this.statusDict());
        this.checkIfLoading();
        if (this.shouldSkip())
            return;
        this.markLoadStartedAt();
        this.setLoadingStateVariables(LogPrefix.TRIGGER_FEED_UPDATE);
        const tootsForHashtags = async (key) => {
            const tagList = await tags_for_fetching_toots_1.default.create(key);
            return await this.fetchAndMergeToots(tagList.getToots(), tagList.logger);
        };
        const dataLoads = [
            // Toot fetchers
            this.getHomeTimeline().then((toots) => this.homeFeed = toots),
            this.fetchAndMergeToots(api_1.default.instance.getHomeserverToots(), loggers[enums_1.CacheKey.HOMESERVER_TOOTS]),
            this.fetchAndMergeToots(mastodon_server_1.default.fediverseTrendingToots(), loggers[enums_1.CacheKey.FEDIVERSE_TRENDING_TOOTS]),
            ...Object.values(enums_1.TagTootsCacheKey).map(tootsForHashtags),
            // Other data fetchers
            mastodon_server_1.default.getTrendingData().then((trendingData) => this.trendingData = trendingData),
            api_1.default.instance.getUserData(),
            scorer_cache_1.default.prepareScorers(),
        ];
        const allResults = await Promise.allSettled(dataLoads);
        loggers[LogPrefix.TRIGGER_FEED_UPDATE].deep(`FINISHED promises, allResults:`, allResults);
        await this.finishFeedUpdate();
    }
    /**
     * Trigger the loading of additional toots, farther back on the home timeline.
     * @returns {Promise<void>}
     */
    async triggerHomeTimelineBackFill() {
        loggers[LogPrefix.TRIGGER_TIMELINE_BACKFILL].log(`called, state:`, this.statusDict());
        this.checkIfLoading();
        this.markLoadStartedAt();
        this.setLoadingStateVariables(LogPrefix.TRIGGER_TIMELINE_BACKFILL);
        this.homeFeed = await this.getHomeTimeline(true);
        await this.finishFeedUpdate();
    }
    /**
     * Manually trigger the loading of "moar" user data (recent toots, favourites, notifications, etc).
     * Usually done by a background task on a set interval.
     * @returns {Promise<void>}
     */
    async triggerMoarData() {
        this.checkIfLoading();
        this.loadingStatus = `Triggering moar data fetching...`;
        let shouldReenablePoller = false;
        if (this.dataPoller) {
            moar_data_poller_1.moarDataLogger.log(`Disabling current data poller...`);
            this.dataPoller && clearInterval(this.dataPoller); // Stop the dataPoller if it's running
            this.dataPoller = undefined;
            shouldReenablePoller = true;
        }
        try {
            const _shouldContinue = await (0, moar_data_poller_1.getMoarData)();
        }
        catch (error) {
            api_1.default.throwSanitizedRateLimitError(error, `triggerMoarData() Error pulling user data:`);
        }
        finally {
            // reenable when finished
            if (shouldReenablePoller)
                this.enableMoarDataBackgroundPoller();
            this.loadingStatus = null;
        }
    }
    /**
     * Collect *ALL* the user's history data from the server - past toots, favourites, etc.
     * Use with caution!
     * @returns {Promise<void>}
     */
    async triggerPullAllUserData() {
        const hereLogger = loggers[LogPrefix.TRIGGER_PULL_ALL_USER_DATA];
        hereLogger.log(`Called, state:`, this.statusDict());
        this.checkIfLoading();
        this.markLoadStartedAt();
        this.setLoadingStateVariables(LogPrefix.TRIGGER_PULL_ALL_USER_DATA);
        this.dataPoller && clearInterval(this.dataPoller); // Stop the dataPoller if it's running
        try {
            const _allResults = await Promise.allSettled([
                api_1.default.instance.getFavouritedToots(api_1.FULL_HISTORY_PARAMS),
                // TODO: there's just too many notifications to pull all of them
                api_1.default.instance.getNotifications({ maxRecords: config_1.MAX_ENDPOINT_RECORDS_TO_PULL, moar: true }),
                api_1.default.instance.getRecentUserToots(api_1.FULL_HISTORY_PARAMS),
            ]);
            await this.recomputeScorers();
            hereLogger.log(`Finished!`);
        }
        catch (error) {
            api_1.default.throwSanitizedRateLimitError(error, hereLogger.line(`Error pulling user data:`));
        }
        finally {
            this.loadingStatus = null; // TODO: should we restart the data poller?
        }
    }
    /**
     * Return an object describing the state of the world. Mostly for debugging.
     * @returns {Promise<Record<string, any>>} State object.
     */
    async getCurrentState() {
        return {
            Algorithm: this.statusDict(),
            Api: api_1.default.instance.currentState(),
            Config: config_1.config,
            Filters: this.filters,
            Homeserver: await this.serverInfo(),
            Storage: await Storage_1.default.storedObjsInfo(),
            Trending: this.trendingData,
            UserData: await api_1.default.instance.getUserData(),
        };
    }
    /**
     * Build array of objects suitable for charting timeline scoring data by quintile/decile/etc. with Recharts.
     * @param {number} numPercentiles - Number of percentiles for stats.
     * @returns {object[]} Recharts data points.
     */
    getRechartsStatsData(numPercentiles) {
        return (0, stats_helper_1.rechartsDataPoints)(this.feed, numPercentiles);
    }
    /**
     * Return the user's current weightings for each score category.
     * @returns {Promise<Weights>} The user's weights.
     */
    async getUserWeights() {
        return await Storage_1.default.getWeights();
    }
    /**
     * Return the timestamp of the most recent toot from followed accounts + hashtags ONLY.
     * @returns {Date | null} The most recent toot date or null.
     */
    mostRecentHomeTootAt() {
        // TODO: this.homeFeed is only set when fetchHomeFeed() is *finished*
        if (this.homeFeed.length == 0 && this.numTriggers > 1) {
            logger.warn(`mostRecentHomeTootAt() homeFeed is empty, falling back to full feed`);
            return (0, toot_1.mostRecentTootedAt)(this.feed);
        }
        return (0, toot_1.mostRecentTootedAt)(this.homeFeed);
    }
    /**
     * Return the number of seconds since the most recent home timeline toot.
     * @returns {number | null} Age in seconds or null.
     */
    mostRecentHomeTootAgeInSeconds() {
        const mostRecentAt = this.mostRecentHomeTootAt();
        if (!mostRecentAt)
            return null;
        logger.trace(`feed is ${(0, time_helpers_1.ageInMinutes)(mostRecentAt).toFixed(2)} mins old, most recent home toot: ${(0, time_helpers_1.timeString)(mostRecentAt)}`);
        return (0, time_helpers_1.ageInSeconds)(mostRecentAt);
    }
    /**
     * Pull the latest list of muted accounts from the server and use that to filter any newly muted accounts
     * out of the timeline.
     * @returns {Promise<void>}
     */
    async refreshMutedAccounts() {
        const hereLogger = loggers[LogPrefix.REFRESH_MUTED_ACCOUNTS];
        hereLogger.log(`called (${Object.keys(this.userData.mutedAccounts).length} current muted accounts)...`);
        // TODO: move refreshMutedAccounts() to UserData class?
        const mutedAccounts = await api_1.default.instance.getMutedAccounts({ bustCache: true });
        hereLogger.log(`Found ${mutedAccounts.length} muted accounts after refresh...`);
        this.userData.mutedAccounts = account_1.default.buildAccountNames(mutedAccounts);
        await toot_1.default.completeToots(this.feed, loggers[LogPrefix.REFRESH_MUTED_ACCOUNTS], enums_1.JUST_MUTING);
        await this.finishFeedUpdate();
    }
    /**
     * Clear everything from browser storage except the user's identity and weightings (unless complete is true).
     * @param {boolean} [complete=false] - If true, remove user data as well.
     * @returns {Promise<void>}
     */
    async reset(complete = false) {
        logger.warn(`reset() called, clearing all storage...`);
        this.dataPoller && clearInterval(this.dataPoller);
        this.dataPoller = undefined;
        this.cacheUpdater && clearInterval(this.cacheUpdater);
        this.cacheUpdater = undefined;
        this.hasProvidedAnyTootsToClient = false;
        this.loadingStatus = READY_TO_LOAD_MSG;
        this.loadStartedAt = null;
        this.numTriggers = 0;
        this.feed = [];
        this.setTimelineInApp([]);
        // Call other classes' reset methods
        api_1.default.instance.reset();
        scorer_cache_1.default.resetScorers();
        await Storage_1.default.clearAll();
        if (complete) {
            await Storage_1.default.remove(enums_1.AlgorithmStorageKey.USER); // Remove user data so it gets reloaded
        }
        else {
            await this.loadCachedData();
        }
    }
    /**
     * Save the current timeline to the browser storage. Used to save the state of toots' numTimesShown.
     * @returns {Promise<void>}
     */
    async saveTimelineToCache() {
        if (this.isLoading)
            return;
        const newTotalNumTimesShown = this.feed.reduce((sum, toot) => sum + (toot.numTimesShown ?? 0), 0);
        if (this.totalNumTimesShown == newTotalNumTimesShown)
            return;
        try {
            const numShownToots = this.feed.filter(toot => toot.numTimesShown).length;
            const msg = `Saving ${this.feed.length} toots with ${newTotalNumTimesShown} times shown`;
            loggers[enums_1.CacheKey.TIMELINE_TOOTS].debug(`${msg} on ${numShownToots} toots (previous totalNumTimesShown: ${this.totalNumTimesShown})`);
            await Storage_1.default.set(enums_1.CacheKey.TIMELINE_TOOTS, this.feed);
            this.totalNumTimesShown = newTotalNumTimesShown;
        }
        catch (error) {
            loggers[enums_1.CacheKey.TIMELINE_TOOTS].error(`Error saving toots:`, error);
        }
    }
    /**
     * Return info about the Fedialgo user's home mastodon instance.
     * @returns {Promise<mastodon.v2.Instance>} Instance info.
     */
    async serverInfo() {
        return await api_1.default.instance.instanceInfo();
    }
    /**
     * Get the URL for a tag on the user's home instance (aka "server").
     * @param {string | MastodonTag} tag - The tag or tag object.
     * @returns {string} The tag URL.
     */
    tagUrl(tag) {
        return api_1.default.instance.tagUrl(tag);
    }
    /**
     * Update the feed filters and return the newly filtered feed.
     * @param {FeedFilterSettings} newFilters - The new filter settings.
     * @returns {Toot[]} The filtered feed.
     */
    updateFilters(newFilters) {
        logger.info(`updateFilters() called with newFilters:`, newFilters);
        this.filters = newFilters;
        Storage_1.default.setFilters(newFilters);
        return this.filterFeedAndSetInApp();
    }
    /**
     * Update user weightings and rescore / resort the feed.
     * @param {Weights} userWeights - The new user weights.
     * @returns {Promise<Toot[]>} The filtered and rescored feed.
     */
    async updateUserWeights(userWeights) {
        logger.info("updateUserWeights() called with weights:", userWeights);
        scorer_1.default.validateWeights(userWeights);
        await Storage_1.default.setWeightings(userWeights);
        return this.scoreAndFilterFeed();
    }
    /**
     * Update user weightings to one of the preset values and rescore / resort the feed.
     * @param {WeightPresetLabel | string} presetName - The preset name.
     * @returns {Promise<Toot[]>} The filtered and rescored feed.
     */
    async updateUserWeightsToPreset(presetName) {
        logger.info("updateUserWeightsToPreset() called with presetName:", presetName);
        if (!(0, weight_presets_1.isWeightPresetLabel)(presetName)) {
            logger.logAndThrowError(`Invalid weight preset: "${presetName}"`);
        }
        return await this.updateUserWeights(weight_presets_1.WEIGHT_PRESETS[presetName]);
    }
    ///////////////////////////////
    //      Private Methods      //
    ///////////////////////////////
    // Throw an error if the feed is loading
    checkIfLoading() {
        if (this.isLoading) {
            logger.warn(`Load in progress already!`, this.statusDict());
            throw new Error(GET_FEED_BUSY_MSG);
        }
    }
    // Return true if we're in QUICK_MODE and the feed is fresh enough that we don't need to update it (for dev)
    shouldSkip() {
        let feedAgeInMinutes = this.mostRecentHomeTootAgeInSeconds();
        if (feedAgeInMinutes)
            feedAgeInMinutes /= 60;
        const maxAgeMinutes = config_1.config.minTrendingMinutesUntilStale();
        if (environment_helpers_1.isQuickMode && feedAgeInMinutes && feedAgeInMinutes < maxAgeMinutes && this.numTriggers <= 1) {
            loggers[LogPrefix.TRIGGER_FEED_UPDATE].debug(`QUICK_MODE Feed's ${feedAgeInMinutes.toFixed(0)}s old, skipping`);
            // Needs to be called to update the feed in the app
            scorer_cache_1.default.prepareScorers().then((_t) => this.filterFeedAndSetInApp());
            return true;
        }
        else {
            return false;
        }
    }
    // Merge a new batch of toots into the feed.
    // Mutates this.feed and returns whatever newToots are retrieve by tooFetcher()
    async fetchAndMergeToots(tootFetcher, logger) {
        const startedAt = new Date();
        let newToots = [];
        try {
            newToots = await tootFetcher;
            this.logTelemetry(`Got ${newToots.length} toots for ${enums_1.CacheKey.HOME_TIMELINE_TOOTS}`, startedAt, logger);
        }
        catch (e) {
            api_1.default.throwIfAccessTokenRevoked(logger, e, `Error fetching toots ${(0, time_helpers_1.ageString)(startedAt)}`);
        }
        await this.lockedMergeToFeed(newToots, logger);
        return newToots;
    }
    // Filter the feed based on the user's settings. Has the side effect of calling the setTimelineInApp() callback
    // that will send the client using this library the filtered subset of Toots (this.feed will always maintain
    // the master timeline).
    filterFeedAndSetInApp() {
        const filteredFeed = this.feed.filter(toot => toot.isInTimeline(this.filters));
        this.setTimelineInApp(filteredFeed);
        if (!this.hasProvidedAnyTootsToClient && this.feed.length > 0) {
            this.hasProvidedAnyTootsToClient = true;
            const msg = `First ${filteredFeed.length} toots sent to client`;
            this.logTelemetry(msg, this.loadStartedAt || new Date());
        }
        return filteredFeed;
    }
    // The "load is finished" version of setLoadingStateVariables().
    async finishFeedUpdate() {
        const hereLogger = loggers[LogPrefix.FINISH_FEED_UPDATE];
        this.loadingStatus = FINALIZING_SCORES_MSG;
        // Now that all data has arrived go back over the feed and do the slow calculations of trendingLinks etc.
        loggers[LogPrefix.FINISH_FEED_UPDATE].debug(`${this.loadingStatus}...`);
        await toot_1.default.completeToots(this.feed, hereLogger);
        this.feed = await toot_1.default.removeInvalidToots(this.feed, hereLogger);
        // TODO: removeUsersOwnToots() shouldn't be necessary but bc of a bug user toots ending up in the feed. Remove in a week or so.
        this.feed = toot_1.default.removeUsersOwnToots(this.feed, hereLogger);
        await (0, feed_filters_1.updateBooleanFilterOptions)(this.filters, this.feed);
        //updateHashtagCounts(this.filters, this.feed);  // TODO: this took too long (4 minutes for 3000 toots) but maybe is ok now?
        await this.scoreAndFilterFeed();
        if (this.loadStartedAt) {
            this.logTelemetry(`finished home TL load w/ ${this.feed.length} toots`, this.loadStartedAt);
            this.lastLoadTimeInSeconds = (0, time_helpers_1.ageInSeconds)(this.loadStartedAt);
        }
        else {
            hereLogger.warn(`finished but loadStartedAt is null!`);
        }
        this.loadStartedAt = null;
        this.loadingStatus = null;
        this.launchBackgroundPollers();
    }
    // Simple wrapper for triggering fetchHomeFeed()
    async getHomeTimeline(moreOldToots) {
        return await api_1.default.instance.fetchHomeFeed({
            mergeTootsToFeed: this.lockedMergeToFeed.bind(this),
            moar: moreOldToots
        });
    }
    // Kick off the MOAR data poller to collect more user history data if it doesn't already exist
    // as well as the cache updater that saves the current state of the timeline toots' alreadyShown to storage
    launchBackgroundPollers() {
        this.enableMoarDataBackgroundPoller();
        // The cache updater writes the current state of the feed to storage every few seconds
        // to capture changes to the alreadyShown state of toots.
        if (this.cacheUpdater) {
            moar_data_poller_1.moarDataLogger.trace(`cacheUpdater already exists, not starting another one`);
            return;
        }
        this.cacheUpdater = setInterval(async () => await this.saveTimelineToCache(), config_1.config.toots.saveChangesIntervalSeconds * 1000);
    }
    // Load cached data from storage. This is called when the app is first opened and when reset() is called.
    async loadCachedData() {
        this.homeFeed = await Storage_1.default.getCoerced(enums_1.CacheKey.HOME_TIMELINE_TOOTS);
        this.feed = await Storage_1.default.getCoerced(enums_1.CacheKey.TIMELINE_TOOTS);
        if (this.feed.length == config_1.config.toots.maxTimelineLength) {
            const numToClear = config_1.config.toots.maxTimelineLength - config_1.config.toots.truncateFullTimelineToLength;
            logger.info(`Timeline cache is full (${this.feed.length}), discarding ${numToClear} old toots`);
            this.feed = (0, collection_helpers_1.truncateToConfiguredLength)(this.feed, config_1.config.toots.truncateFullTimelineToLength, logger);
            await Storage_1.default.set(enums_1.CacheKey.TIMELINE_TOOTS, this.feed);
        }
        this.trendingData = await Storage_1.default.getTrendingData();
        this.filters = await Storage_1.default.getFilters() ?? (0, feed_filters_1.buildNewFilterSettings)();
        await (0, feed_filters_1.updateBooleanFilterOptions)(this.filters, this.feed);
        this.setTimelineInApp(this.feed);
        logger.log(`<loadCachedData()> loaded ${this.feed.length} timeline toots from cache, trendingData`);
    }
    // Apparently if the mutex lock is inside mergeTootsToFeed() then the state of this.feed is not consistent
    // which can result in toots getting lost as threads try to merge newToots into different this.feed states.
    // Wrapping the entire function in a mutex seems to fix this (though i'm not sure why).
    async lockedMergeToFeed(newToots, logger) {
        const hereLogger = logger.tempLogger('lockedMergeToFeed');
        const releaseMutex = await (0, log_helpers_1.lockExecution)(this.mergeMutex, hereLogger);
        try {
            await this.mergeTootsToFeed(newToots, logger);
            hereLogger.trace(`Merged ${newToots.length} newToots, released mutex`);
        }
        finally {
            releaseMutex();
        }
    }
    ;
    // Log timing info
    logTelemetry(msg, startedAt, inLogger) {
        (inLogger || logger).logTelemetry(msg, startedAt, 'current state', this.statusDict());
    }
    markLoadStartedAt() {
        this.loadStartedAt = new Date();
    }
    // Merge newToots into this.feed, score, and filter the feed.
    // NOTE: Don't call this directly! Use lockedMergeTootsToFeed() instead.
    async mergeTootsToFeed(newToots, inLogger) {
        const startedAt = new Date();
        const numTootsBefore = this.feed.length;
        this.feed = toot_1.default.dedupeToots([...this.feed, ...newToots], inLogger.tempLogger('mergeTootsToFeed'));
        await (0, feed_filters_1.updateBooleanFilterOptions)(this.filters, this.feed);
        await this.scoreAndFilterFeed();
        inLogger.logTelemetry(`merged ${newToots.length} new toots into ${numTootsBefore} timeline toots`, startedAt);
        this.setLoadingStateVariables(inLogger.logPrefix);
    }
    // Recompute the scorers' computations based on user history etc. and trigger a rescore of the feed
    async recomputeScorers() {
        await api_1.default.instance.getUserData(true); // Refresh user data
        await scorer_cache_1.default.prepareScorers(true); // The "true" arg is the key here
        await this.scoreAndFilterFeed();
    }
    // Score the feed, sort it, save it to storage, and call filterFeed() to update the feed in the app
    // Returns the FILTERED set of toots (NOT the entire feed!)
    async scoreAndFilterFeed() {
        // await ScorerCache.prepareScorers();
        this.feed = await scorer_1.default.scoreToots(this.feed, true);
        this.feed = (0, collection_helpers_1.truncateToConfiguredLength)(this.feed, config_1.config.toots.maxTimelineLength, logger.tempLogger('scoreAndFilterFeed()'));
        await Storage_1.default.set(enums_1.CacheKey.TIMELINE_TOOTS, this.feed);
        return this.filterFeedAndSetInApp();
    }
    // sets this.loadingStatus to a message indicating the current state of the feed
    setLoadingStateVariables(logPrefix) {
        // If feed is empty then it's an initial load, otherwise it's a catchup if TRIGGER_FEED
        if (!this.feed.length) {
            this.loadingStatus = INITIAL_LOAD_STATUS;
        }
        else if (logPrefix == LogPrefix.TRIGGER_TIMELINE_BACKFILL) {
            this.loadingStatus = `Loading older home timeline toots`;
        }
        else if (logPrefix == LogPrefix.TRIGGER_PULL_ALL_USER_DATA) {
            this.loadingStatus = PULLING_USER_HISTORY;
        }
        else if (this.homeFeed.length > 0) {
            const mostRecentAt = this.mostRecentHomeTootAt();
            this.loadingStatus = `Loading new toots` + (0, string_helpers_1.optionalSuffix)(mostRecentAt, t => `since ${(0, time_helpers_1.timeString)(t)}`);
        }
        else {
            this.loadingStatus = `Loading more toots (retrieved ${this.feed.length.toLocaleString()} toots so far)`;
        }
        loggers[LogPrefix.SET_LOADING_STATUS].trace(`${logPrefix}`, this.statusDict());
    }
    // Info about the state of this TheAlgorithm instance
    statusDict() {
        const mostRecentTootAt = this.mostRecentHomeTootAt();
        const oldestTootAt = (0, toot_1.earliestTootedAt)(this.homeFeed);
        let numHoursInHomeFeed = null;
        if (mostRecentTootAt && oldestTootAt) {
            numHoursInHomeFeed = (0, time_helpers_1.ageInHours)(oldestTootAt, mostRecentTootAt);
        }
        return {
            feedNumToots: this.feed?.length,
            homeFeedNumToots: this.homeFeed?.length,
            homeFeedMostRecentAt: mostRecentTootAt ? (0, time_helpers_1.toISOFormat)(mostRecentTootAt) : null,
            homeFeedOldestAt: oldestTootAt ? (0, time_helpers_1.toISOFormat)(oldestTootAt) : null,
            homeFeedTimespanHours: numHoursInHomeFeed ? Number(numHoursInHomeFeed.toPrecision(2)) : null,
            isLoading: this.isLoading,
            loadingStatus: this.loadingStatus,
            minMaxScores: (0, collection_helpers_1.computeMinMax)(this.feed, (toot) => toot.scoreInfo?.score),
        };
    }
    enableMoarDataBackgroundPoller() {
        if (this.dataPoller) {
            moar_data_poller_1.moarDataLogger.trace(`Data poller already exists, not starting another one`);
            return;
        }
        this.dataPoller = setInterval(async () => {
            const shouldContinue = await (0, moar_data_poller_1.getMoarData)();
            await this.recomputeScorers(); // Force scorers to recompute data, rescore the feed
            if (!shouldContinue) {
                moar_data_poller_1.moarDataLogger.log(`Stopping data poller...`);
                this.dataPoller && clearInterval(this.dataPoller);
            }
        }, config_1.config.api.backgroundLoadIntervalMinutes * config_1.SECONDS_IN_MINUTE * 1000);
    }
}
;
exports.default = TheAlgorithm;
//# sourceMappingURL=index.js.map