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
exports.timeString = exports.sortKeysByValue = exports.sleep = exports.optionalSuffix = exports.makePercentileChunks = exports.makeChunks = exports.isValueInStringEnum = exports.isAccessTokenRevokedError = exports.extractDomain = exports.AgeIn = exports.TypeFilterName = exports.TrendingType = exports.TagTootsCategory = exports.ScoreName = exports.NonScoreWeightName = exports.MediaCategory = exports.BooleanFilterName = exports.Toot = exports.TagList = exports.NumericFilter = exports.Logger = exports.BooleanFilter = exports.Account = exports.VIDEO_TYPES = exports.READY_TO_LOAD_MSG = exports.GIFV = exports.GET_FEED_BUSY_MSG = exports.FEDIALGO = exports.FILTER_OPTION_DATA_SOURCES = exports.DEFAULT_FONT_SIZE = void 0;
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
const retoots_in_feed_scorer_1 = __importDefault(require("./scorer/toot/retoots_in_feed_scorer"));
const scorer_1 = __importDefault(require("./scorer/scorer"));
const scorer_cache_1 = __importDefault(require("./scorer/scorer_cache"));
const Storage_1 = __importDefault(require("./Storage"));
const tag_list_1 = __importDefault(require("./api/tag_list"));
exports.TagList = tag_list_1.default;
const tags_for_fetching_toots_1 = __importDefault(require("./api/tags_for_fetching_toots"));
const toot_1 = __importStar(require("./api/objects/toot"));
exports.Toot = toot_1.default;
const trending_links_scorer_1 = __importDefault(require("./scorer/toot/trending_links_scorer"));
const trending_tags_scorer_1 = __importDefault(require("./scorer/toot/trending_tags_scorer"));
const trending_toots_scorer_1 = __importDefault(require("./scorer/toot/trending_toots_scorer"));
const user_data_1 = __importDefault(require("./api/user_data"));
const user_data_poller_1 = __importDefault(require("./api/user_data_poller"));
const video_attachment_scorer_1 = __importDefault(require("./scorer/toot/video_attachment_scorer"));
const time_helpers_1 = require("./helpers/time_helpers");
Object.defineProperty(exports, "AgeIn", { enumerable: true, get: function () { return time_helpers_1.AgeIn; } });
Object.defineProperty(exports, "sleep", { enumerable: true, get: function () { return time_helpers_1.sleep; } });
Object.defineProperty(exports, "timeString", { enumerable: true, get: function () { return time_helpers_1.timeString; } });
const feed_filters_1 = require("./filters/feed_filters");
const string_helpers_1 = require("./helpers/string_helpers");
Object.defineProperty(exports, "DEFAULT_FONT_SIZE", { enumerable: true, get: function () { return string_helpers_1.DEFAULT_FONT_SIZE; } });
Object.defineProperty(exports, "FEDIALGO", { enumerable: true, get: function () { return string_helpers_1.FEDIALGO; } });
Object.defineProperty(exports, "GIFV", { enumerable: true, get: function () { return string_helpers_1.GIFV; } });
Object.defineProperty(exports, "VIDEO_TYPES", { enumerable: true, get: function () { return string_helpers_1.VIDEO_TYPES; } });
Object.defineProperty(exports, "extractDomain", { enumerable: true, get: function () { return string_helpers_1.extractDomain; } });
Object.defineProperty(exports, "optionalSuffix", { enumerable: true, get: function () { return string_helpers_1.optionalSuffix; } });
const errors_1 = require("./api/errors");
Object.defineProperty(exports, "isAccessTokenRevokedError", { enumerable: true, get: function () { return errors_1.isAccessTokenRevokedError; } });
const environment_helpers_1 = require("./helpers/environment_helpers");
const mutex_helpers_1 = require("./helpers/mutex_helpers");
const logger_1 = require("./helpers/logger");
Object.defineProperty(exports, "Logger", { enumerable: true, get: function () { return logger_1.Logger; } });
const config_1 = require("./config");
const stats_helper_1 = require("./helpers/stats_helper");
const weight_presets_1 = require("./scorer/weight_presets");
const enums_1 = require("./enums");
Object.defineProperty(exports, "BooleanFilterName", { enumerable: true, get: function () { return enums_1.BooleanFilterName; } });
Object.defineProperty(exports, "MediaCategory", { enumerable: true, get: function () { return enums_1.MediaCategory; } });
Object.defineProperty(exports, "NonScoreWeightName", { enumerable: true, get: function () { return enums_1.NonScoreWeightName; } });
Object.defineProperty(exports, "ScoreName", { enumerable: true, get: function () { return enums_1.ScoreName; } });
Object.defineProperty(exports, "TagTootsCategory", { enumerable: true, get: function () { return enums_1.TagTootsCategory; } });
Object.defineProperty(exports, "TrendingType", { enumerable: true, get: function () { return enums_1.TrendingType; } });
Object.defineProperty(exports, "TypeFilterName", { enumerable: true, get: function () { return enums_1.TypeFilterName; } });
Object.defineProperty(exports, "isValueInStringEnum", { enumerable: true, get: function () { return enums_1.isValueInStringEnum; } });
const collection_helpers_1 = require("./helpers/collection_helpers");
Object.defineProperty(exports, "makeChunks", { enumerable: true, get: function () { return collection_helpers_1.makeChunks; } });
Object.defineProperty(exports, "makePercentileChunks", { enumerable: true, get: function () { return collection_helpers_1.makePercentileChunks; } });
Object.defineProperty(exports, "sortKeysByValue", { enumerable: true, get: function () { return collection_helpers_1.sortKeysByValue; } });
const types_1 = require("./types");
Object.defineProperty(exports, "FILTER_OPTION_DATA_SOURCES", { enumerable: true, get: function () { return types_1.FILTER_OPTION_DATA_SOURCES; } });
const EMPTY_TRENDING_DATA = {
    links: [],
    tags: new tag_list_1.default([], enums_1.TagTootsCategory.TRENDING),
    servers: {},
    toots: []
};
const DEFAULT_SET_TIMELINE_IN_APP = (_feed) => console.debug(`Default setTimelineInApp() called`);
const logger = new logger_1.Logger(`TheAlgorithm`);
const loadCacheLogger = logger.tempLogger(`loadCachedData()`);
const saveTimelineToCacheLogger = logger.tempLogger(`saveTimelineToCache`);
const loggers = (0, enums_1.buildCacheKeyDict)((key) => new logger_1.Logger(key), enums_1.ALL_ACTIONS.reduce((_loggers, action) => {
    _loggers[action] = logger.tempLogger(action);
    return _loggers;
}, {}));
;
/**
 * Main class for scoring, sorting, and managing a Mastodon feed made of {@linkcode Toot} objects.
 *
 * {@linkcode TheAlgorithm} orchestrates fetching, scoring, filtering, and updating the user's timeline/feed.
 * It manages feature and feed scorers, trending data, filters, user weights, and background polling. Key
 * responsibilities:
 *
 *  1. Fetches and merges toots from multiple sources (home timeline, trending, hashtags, etc.).
 *  2. Applies scoring algorithms and user-defined weights to rank toots.
 *  3. Filters the feed based on user settings and filter options.
 *  4. Handles background polling for new data and saving state to storage.
 *  5. Provides methods for updating filters, weights, and retrieving current state.
 *  6. Exposes utility methods for stats, server info, and tag URLs.
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
    filters = (0, feed_filters_1.buildNewFilterSettings)();
    lastLoadTimeInSeconds;
    loadingStatus = config_1.config.locale.messages[enums_1.LogAction.INITIAL_LOADING_STATUS];
    trendingData = EMPTY_TRENDING_DATA;
    get apiErrorMsgs() { return api_1.default.instance.apiErrorMsgs(); }
    ;
    get isLoading() { return this.loadingMutex.isLocked(); }
    ;
    get timeline() { return [...this.feed]; }
    ;
    get userData() { return api_1.default.instance.userData || new user_data_1.default(); }
    ;
    // Constructor arguments
    setTimelineInApp; // Optional callback to set the feed in the app using this package
    // Other private variables
    feed = [];
    homeFeed = []; // Just the toots pulled from the home timeline
    hasProvidedAnyTootsToClient = false; // Flag to indicate if the feed has been set in the app
    loadStartedAt = new Date(); // Timestamp of when the feed started loading
    totalNumTimesShown = 0; // Sum of timeline toots' numTimesShown
    // Utility
    loadingMutex = new async_mutex_1.Mutex();
    mergeMutex = new async_mutex_1.Mutex();
    numUnscannedToots = 0; // Keep track of how many new toots were merged into the feed but not into the filter options
    numTriggers = 0; // How many times has a load been triggered, only matters for QUICK_LOAD mode
    _releaseLoadingMutex; // Mutex release function for loading state
    // Background tasks
    cacheUpdater;
    userDataPoller = new user_data_poller_1.default();
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
        const algo = new TheAlgorithm(params);
        scorer_cache_1.default.addScorers(algo.tootScorers, algo.feedScorers);
        await algo.loadCachedData();
        return algo;
    }
    /**
     * Private constructor. Use {@linkcode TheAlgorithm.create} to instantiate.
     * @param {AlgorithmArgs} params - Constructor params (API client, user, and optional timeline callback/locale).
     */
    constructor(params) {
        this.setTimelineInApp = params.setTimelineInApp ?? DEFAULT_SET_TIMELINE_IN_APP;
    }
    /**
     * Trigger the retrieval of the user's timeline from all the sources.
     * @returns {Promise<void>}
     */
    async triggerFeedUpdate() {
        if (this.shouldSkip())
            return;
        const action = enums_1.LoadAction.FEED_UPDATE;
        const hereLogger = loggers[action];
        await this.startAction(action);
        try {
            const tootsForHashtags = async (key) => {
                hereLogger.trace(`Fetching toots for hashtags with key: ${key}`);
                const tagList = await tags_for_fetching_toots_1.default.create(key);
                return await this.fetchAndMergeToots(tagList.getToots(), tagList.logger);
            };
            const dataLoads = [
                // Toot fetchers
                this.getHomeTimeline().then((toots) => this.homeFeed = toots),
                this.fetchAndMergeToots(api_1.default.instance.getHomeserverToots(), loggers[enums_1.CacheKey.HOMESERVER_TOOTS]),
                this.fetchAndMergeToots(mastodon_server_1.default.fediverseTrendingToots(), loggers[enums_1.FediverseCacheKey.TRENDING_TOOTS]),
                ...Object.values(enums_1.TagTootsCategory).map(async (key) => await tootsForHashtags(key)),
                // Other data fetchers
                mastodon_server_1.default.getTrendingData().then((trendingData) => this.trendingData = trendingData),
                api_1.default.instance.getUserData(),
                scorer_cache_1.default.prepareScorers(),
            ];
            const allResults = await Promise.allSettled(dataLoads);
            hereLogger.deep(`FINISHED promises, allResults:`, allResults);
            await this.finishFeedUpdate();
        }
        finally {
            this.releaseLoadingMutex(action);
        }
    }
    /**
     * Trigger the fetching of additional earlier {@linkcode Toot}s from the server.
     * @returns {Promise<void>}
     */
    async triggerHomeTimelineBackFill() {
        await this.startAction(enums_1.LoadAction.TIMELINE_BACKFILL);
        try {
            this.homeFeed = await this.getHomeTimeline(true);
            await this.finishFeedUpdate();
        }
        finally {
            this.releaseLoadingMutex(enums_1.LoadAction.TIMELINE_BACKFILL);
        }
    }
    /**
     * Manually trigger the loading of "moar" user data (recent toots, favourites, notifications, etc).
     * Usually done by a background task on a set interval.
     * @returns {Promise<void>}
     */
    async triggerMoarData() {
        const shouldReenablePoller = this.userDataPoller.stop();
        await this.startAction(enums_1.LoadAction.GET_MOAR_DATA);
        try {
            await this.userDataPoller.getMoarData();
            await this.recomputeScores();
        }
        catch (error) {
            (0, errors_1.throwSanitizedRateLimitError)(error, `triggerMoarData() Error pulling user data:`);
        }
        finally {
            if (shouldReenablePoller)
                this.userDataPoller.start();
            this.releaseLoadingMutex(enums_1.LoadAction.GET_MOAR_DATA);
        }
    }
    /**
     * Collect **ALL** the user's history data from the server - past toots, favourites, etc.
     * Use with caution!
     * @returns {Promise<void>}
     */
    async triggerPullAllUserData() {
        const action = enums_1.LoadAction.PULL_ALL_USER_DATA;
        const hereLogger = loggers[action];
        this.startAction(action);
        try {
            this.userDataPoller.stop(); // Stop the dataPoller if it's running
            const _allResults = await Promise.allSettled([
                api_1.default.instance.getFavouritedToots(api_1.FULL_HISTORY_PARAMS),
                // TODO: there's just too many notifications to pull all of them
                api_1.default.instance.getNotifications({ maxRecords: config_1.MAX_ENDPOINT_RECORDS_TO_PULL, moar: true }),
                api_1.default.instance.getRecentUserToots(api_1.FULL_HISTORY_PARAMS),
            ]);
            await this.recomputeScores();
        }
        catch (error) {
            (0, errors_1.throwSanitizedRateLimitError)(error, hereLogger.line(`Error pulling user data:`));
        }
        finally {
            this.releaseLoadingMutex(action); // TODO: should we restart data poller?
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
     * Build array of objects suitable for charting timeline scoring data by quintile/decile/etc.
     * with {@link https://recharts.org/ Recharts}.
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
     * Return the number of seconds since the most recent home timeline {@linkcode Toot}.
     * @returns {number | null} Age in seconds or null.
     */
    mostRecentHomeTootAgeInSeconds() {
        const mostRecentAt = this.mostRecentHomeTootAt();
        if (!mostRecentAt)
            return null;
        logger.trace(`feed is ${time_helpers_1.AgeIn.minutes(mostRecentAt).toFixed(2)} min old, most recent home toot: ${(0, time_helpers_1.timeString)(mostRecentAt)}`);
        return time_helpers_1.AgeIn.seconds(mostRecentAt);
    }
    /**
     * Pull the latest list of muted accounts from the server and use that to filter any newly muted
     * accounts out of the timeline.
     * @returns {Promise<void>}
     */
    async refreshMutedAccounts() {
        const hereLogger = loggers[enums_1.LoadAction.REFRESH_MUTED_ACCOUNTS];
        hereLogger.log(`called (${Object.keys(this.userData.mutedAccounts).length} current muted accounts)...`);
        // TODO: move refreshMutedAccounts() to UserData class?
        const mutedAccounts = await api_1.default.instance.getMutedAccounts({ bustCache: true });
        hereLogger.log(`Found ${mutedAccounts.length} muted accounts after refresh...`);
        this.userData.mutedAccounts = account_1.default.buildAccountNames(mutedAccounts);
        await toot_1.default.completeToots(this.feed, hereLogger, enums_1.LoadAction.REFRESH_MUTED_ACCOUNTS);
        await this.finishFeedUpdate();
    }
    /**
     * Clear everything from browser storage except the user's identity and weightings (unless complete is true).
     * @param {boolean} [complete=false] - If true, remove user data as well.
     * @returns {Promise<void>}
     */
    async reset(complete = false) {
        await this.startAction(enums_1.LoadAction.RESET);
        try {
            this.userDataPoller.stop();
            this.cacheUpdater && clearInterval(this.cacheUpdater);
            this.cacheUpdater = undefined;
            this.hasProvidedAnyTootsToClient = false;
            this.loadingStatus = config_1.config.locale.messages[enums_1.LogAction.INITIAL_LOADING_STATUS];
            this.loadStartedAt = new Date();
            this.numTriggers = 0;
            this.trendingData = EMPTY_TRENDING_DATA;
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
        finally {
            this.releaseLoadingMutex(enums_1.LoadAction.RESET);
        }
    }
    /**
     * Save the current timeline to the browser storage. Used to save the state of {@linkcode Toot.numTimesShown}.
     * @returns {Promise<void>}
     */
    async saveTimelineToCache() {
        const newTotalNumTimesShown = this.feed.reduce((sum, toot) => sum + (toot.numTimesShown ?? 0), 0);
        if (this.isLoading || (this.totalNumTimesShown == newTotalNumTimesShown))
            return;
        try {
            const numShownToots = this.feed.filter(toot => toot.numTimesShown).length;
            const msg = `Saving ${this.feed.length} toots with ${newTotalNumTimesShown} times shown` +
                ` on ${numShownToots} toots (previous totalNumTimesShown: ${this.totalNumTimesShown})`;
            saveTimelineToCacheLogger.debug(msg);
            await Storage_1.default.set(enums_1.AlgorithmStorageKey.TIMELINE_TOOTS, this.feed);
            this.totalNumTimesShown = newTotalNumTimesShown;
        }
        catch (error) {
            saveTimelineToCacheLogger.error(`Error saving toots:`, error);
        }
    }
    /**
     * True if FediAlgo user is on a GoToSocial instance instead of plain vanilla Mastodon.
     * @returns {boolean}
     */
    async isGoToSocialUser() {
        return await api_1.default.instance.isGoToSocialUser();
    }
    /**
     * Update {@linkcode this.trendingData} with latest available data.
     * // TODO: this shouldn't be necessary but there's weirdness on initial load
     * @returns {Promise<TrendingData>}
     */
    async refreshTrendingData() {
        this.trendingData = await mastodon_server_1.default.getTrendingData();
        return this.trendingData;
    }
    /**
     * Returns info about the Fedialgo user's home Mastodon instance.
     * @returns {Promise<mastodon.v2.Instance>} Instance info.
     */
    async serverInfo() {
        return await api_1.default.instance.instanceInfo();
    }
    /**
     * Get the URL for a tag on the user's home instance (aka "server").
     * @param {string | Hashtag} tag - The tag or tag object.
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
    /**
     * Merge a new batch of {@linkcode Toot}s into the feed. Mutates {@linkcode this.feed}
     * and returns whatever {@linkcode newToots} are retrieved by {@linkcode tootFetcher} argument.
     * @private
     * @param {Promise<Toot[]>} tootFetcher - Promise that resolves to an array of Toots.
     * @param {Logger} logger Logger to use.
     * @returns {Promise<Toot[]>} The new toots that were fetched and merged.
     */
    async fetchAndMergeToots(tootFetcher, logger) {
        const startedAt = new Date();
        let newToots = [];
        try {
            newToots = await tootFetcher;
            logger.logTelemetry(`Got ${newToots.length} toots for ${enums_1.CacheKey.HOME_TIMELINE_TOOTS}`, startedAt);
        }
        catch (e) {
            (0, errors_1.throwIfAccessTokenRevoked)(logger, e, `Error fetching toots ${(0, time_helpers_1.ageString)(startedAt)}`);
        }
        await this.lockedMergeToFeed(newToots, logger);
        return newToots;
    }
    /**
     * Filter the feed based on the user's settings. Has the side effect of calling the
     * {@linkcode TheAlgorithm.setTimelineInApp} callback (if it exists) to send the client
     * using this library the filtered subset of {@linkcode Toot} objects.
     * ({@linkcode TheAlgorithm.feed} will always maintain the master unfiltered set of {@linkcode Toot}s).
     * @private
     * @returns {Toot[]} The filtered feed.
     */
    filterFeedAndSetInApp() {
        const filteredFeed = this.feed.filter(toot => toot.isInTimeline(this.filters));
        this.setTimelineInApp(filteredFeed);
        if (!this.hasProvidedAnyTootsToClient && this.feed.length > 0) {
            this.hasProvidedAnyTootsToClient = true;
            logger.logTelemetry(`First ${filteredFeed.length} toots sent to client`, this.loadStartedAt);
        }
        return filteredFeed;
    }
    /**
     * Do some final cleanup and scoring operations on the feed.
     * @private
     * @returns {Promise<void>}
     */
    async finishFeedUpdate() {
        const action = enums_1.LogAction.FINISH_FEED_UPDATE;
        const hereLogger = loggers[action];
        this.loadingStatus = config_1.config.locale.messages[action];
        // Now that all data has arrived go back over the feed and do the slow calculations of trendingLinks etc.
        hereLogger.debug(`${this.loadingStatus}...`);
        await toot_1.default.completeToots(this.feed, hereLogger);
        this.feed = await toot_1.default.removeInvalidToots(this.feed, hereLogger);
        await (0, feed_filters_1.updateBooleanFilterOptions)(this.filters, this.feed, true);
        await this.scoreAndFilterFeed();
        if (this.loadStartedAt) {
            hereLogger.logTelemetry(`finished home TL load w/ ${this.feed.length} toots`, this.loadStartedAt);
            this.lastLoadTimeInSeconds = time_helpers_1.AgeIn.seconds(this.loadStartedAt);
        }
        else {
            hereLogger.warn(`finished but loadStartedAt is null!`);
        }
        this.loadStartedAt = undefined;
        this.loadingStatus = null;
        this.launchBackgroundPollers();
    }
    /**
     * Simple wrapper for triggering {@linkcode MastoApi.fetchHomeFeed}.
     * @private
     * @returns {Promise<Toot[]>}
     */
    async getHomeTimeline(moreOldToots) {
        return await api_1.default.instance.fetchHomeFeed({
            mergeTootsToFeed: this.lockedMergeToFeed.bind(this),
            moar: moreOldToots
        });
    }
    /**
     * Kick off the MOAR data poller to collect more user history data if it doesn't already exist
     * as well as the cache updater that saves the current state of the timeline toots'
     * {@linkcode alreadyShown} properties to storage.
     * @private
     */
    launchBackgroundPollers() {
        this.userDataPoller.start();
        // The cache updater writes the current state of the feed to storage every few seconds
        // to capture changes to the alreadyShown state of toots.
        if (this.cacheUpdater) {
            logger.trace(`cacheUpdater already exists, not starting another one`);
        }
        else {
            this.cacheUpdater = setInterval(async () => await this.saveTimelineToCache(), config_1.config.toots.saveChangesIntervalSeconds * 1000);
        }
    }
    /**
     * Load cached data from {@linkcode Storage}. Called when the app is first opened and when
     * {@linkcode TheAlgorithm.reset} is invoked.
     * @private
     * @returns {Promise<void>}
     */
    async loadCachedData() {
        this.homeFeed = await Storage_1.default.getCoerced(enums_1.CacheKey.HOME_TIMELINE_TOOTS);
        this.feed = await Storage_1.default.getCoerced(enums_1.AlgorithmStorageKey.TIMELINE_TOOTS);
        if (this.feed.length == config_1.config.toots.maxTimelineLength) {
            const numToClear = config_1.config.toots.maxTimelineLength - config_1.config.toots.truncateFullTimelineToLength;
            loadCacheLogger.info(`Timeline cache is full (${this.feed.length}), discarding ${numToClear} old toots`);
            this.feed = (0, collection_helpers_1.truncateToLength)(this.feed, config_1.config.toots.truncateFullTimelineToLength, logger);
            await Storage_1.default.set(enums_1.AlgorithmStorageKey.TIMELINE_TOOTS, this.feed);
        }
        this.trendingData = await Storage_1.default.getTrendingData();
        this.filters = await Storage_1.default.getFilters() ?? (0, feed_filters_1.buildNewFilterSettings)();
        await (0, feed_filters_1.updateBooleanFilterOptions)(this.filters, this.feed);
        this.setTimelineInApp(this.feed);
        loadCacheLogger.debugWithTraceObjs(`Loaded ${this.feed.length} cached toots + trendingData`, this.trendingData);
    }
    /**
     * Apparently if the mutex lock is inside mergeTootsToFeed() then the state of {@linkcode TheAlgorithm.feed}
     * is not consistent which can result in toots getting lost as threads try to merge {@linkcode newToots}
     * into different {@linkcode TheAlgorithm.feed} states.
     * Wrapping the entire function in a mutex seems to fix this (though i'm not sure why).
     * @private
     * @param {Toot[]} newToots - New toots to merge into this.feed
     * @param {Logger} logger - Logger to use
     * @returns {Promise<void>}
     */
    async lockedMergeToFeed(newToots, logger) {
        const hereLogger = logger.tempLogger('lockedMergeToFeed');
        const releaseMutex = await (0, mutex_helpers_1.lockExecution)(this.mergeMutex, hereLogger);
        try {
            await this.mergeTootsToFeed(newToots, logger);
            hereLogger.trace(`Merged ${newToots.length} newToots, released mutex`);
        }
        finally {
            releaseMutex();
        }
    }
    ;
    /**
     * Merge newToots into {@linkcode TheAlgorithm.feed}, score, and filter the feed.
     * NOTE: Don't call this directly! Use {@linkcode TheAlgorithm.lockedMergeTootsToFeed} instead.
     * @private
     * @param {Toot[]} newToots - New toots to merge into this.feed
     * @param {Logger} inLogger - Logger to use
     * @returns {Promise<void>}
     */
    async mergeTootsToFeed(newToots, inLogger) {
        const hereLogger = inLogger.tempLogger('mergeTootsToFeed');
        const numTootsBefore = this.feed.length;
        const startedAt = new Date();
        // Merge new Toots
        this.feed = toot_1.default.dedupeToots([...this.feed, ...newToots], hereLogger);
        this.numUnscannedToots += newToots.length;
        // Building filter options is expensive so we only do it when it's justifiable
        if ((this.feed.length < config_1.config.toots.minToSkipFilterUpdates) || (this.numUnscannedToots > config_1.config.toots.filterUpdateBatchSize)) {
            await (0, feed_filters_1.updateBooleanFilterOptions)(this.filters, this.feed);
            this.numUnscannedToots = 0;
        }
        else {
            logger.trace(`Skipping filter update, feed length: ${this.feed.length}, unscanned toots: ${this.numUnscannedToots}`);
        }
        await this.scoreAndFilterFeed();
        // Update loadingStatus and log telemetry
        const statusMsgFxn = config_1.config.locale.messages[enums_1.LoadAction.FEED_UPDATE];
        this.loadingStatus = statusMsgFxn(this.feed, this.mostRecentHomeTootAt());
        hereLogger.logTelemetry(`Merged ${newToots.length} new toots into ${numTootsBefore} timeline toots`, startedAt);
    }
    /**
     * Recompute the scorers' computations based on user history etc. and trigger a rescore of the feed.
     * @private
     * @returns {Promise<void>}
     */
    async recomputeScores() {
        await scorer_cache_1.default.prepareScorers(true);
        await this.scoreAndFilterFeed();
    }
    /**
     * Release the loading mutex and reset the loading state variables.
     * @private
     * @param {LoadAction} logPrefix - Action for logging context.
     * @returns {void}
     */
    releaseLoadingMutex(logPrefix) {
        this.loadingStatus = null;
        if (this._releaseLoadingMutex) {
            loggers[logPrefix].info(`Finished, releasing mutex...`);
            this._releaseLoadingMutex();
        }
        else {
            loggers[logPrefix].warn(`releaseLoadingMutex() called but no mutex to release!`);
        }
    }
    /**
     * Score the feed, sort it, save it to storage, and call {@linkcode TheAlgorithm.filterFeedAndSetInApp}
     * to update the feed in the app.
     * @private
     * @returns {Promise<Toot[]>} The filtered set of Toots (NOT the entire feed).
     */
    async scoreAndFilterFeed() {
        this.feed = await scorer_1.default.scoreToots(this.feed, true);
        this.feed = (0, collection_helpers_1.truncateToLength)(this.feed, config_1.config.toots.maxTimelineLength, logger.tempLogger('scoreAndFilterFeed()'));
        await Storage_1.default.set(enums_1.AlgorithmStorageKey.TIMELINE_TOOTS, this.feed);
        return this.filterFeedAndSetInApp();
    }
    /**
     * Return true if we're in {@linkcode QUICK_MODE} and the feed is fresh enough that we don't
     * need to retrieve any new data. Useful for testing UI changes without waiting
     * for the full feed load every time.
     * @private
     * @returns {boolean} True if we should skip the feed update.
     */
    shouldSkip() {
        const hereLogger = loggers[enums_1.LoadAction.FEED_UPDATE];
        hereLogger.debugWithTraceObjs(`${++this.numTriggers} triggers so far, state:`, this.statusDict());
        let feedAgeInMinutes = this.mostRecentHomeTootAgeInSeconds();
        if (feedAgeInMinutes)
            feedAgeInMinutes /= 60;
        const maxAgeMinutes = config_1.config.minTrendingMinutesUntilStale();
        if (environment_helpers_1.isQuickMode && feedAgeInMinutes && feedAgeInMinutes < maxAgeMinutes && this.numTriggers <= 1) {
            hereLogger.debug(`isQuickMode=${environment_helpers_1.isQuickMode}, feed's ${feedAgeInMinutes.toFixed(0)}s old, skipping`);
            // Needs to be called to update the feed in the app
            scorer_cache_1.default.prepareScorers().then((_t) => this.filterFeedAndSetInApp());
            return true;
        }
        else {
            return false;
        }
    }
    /**
     * Lock the mutex and set the {@linkcode TheAlgorithm.loadStartedAt} timestamp.
     * @private
     * @param {LoadAction} logPrefix - Action for logging context.
     * @returns {Promise<void>}
     * @throws {Error} If a load is already in progress.
     */
    async startAction(logPrefix) {
        const hereLogger = loggers[logPrefix];
        const status = config_1.config.locale.messages[logPrefix];
        hereLogger.debugWithTraceObjs(`called`, this.statusDict());
        if (this.isLoading) {
            hereLogger.warn(`Load in progress already!`, this.statusDict());
            throw new Error(config_1.config.locale.messages.isBusy);
        }
        this.loadStartedAt = new Date();
        this._releaseLoadingMutex = await (0, mutex_helpers_1.lockExecution)(this.loadingMutex, logger);
        this.loadingStatus = (typeof status === 'string') ? status : status(this.feed, this.mostRecentHomeTootAt());
    }
    /**
     * Returns info about the state of this {@linkcode TheAlgorithm} instance.
     * @private
     * @returns {Record<string, unknown>} Status dictionary.
     */
    statusDict() {
        const mostRecentTootAt = this.mostRecentHomeTootAt();
        const oldestTootAt = (0, toot_1.earliestTootedAt)(this.homeFeed);
        let numHoursInHomeFeed = null;
        if (mostRecentTootAt && oldestTootAt) {
            numHoursInHomeFeed = time_helpers_1.AgeIn.hours(oldestTootAt, mostRecentTootAt);
        }
        return {
            feedNumToots: this.feed.length,
            homeFeedNumToots: this.homeFeed.length,
            homeFeedMostRecentAt: (0, time_helpers_1.toISOFormatIfExists)(mostRecentTootAt),
            homeFeedOldestAt: (0, time_helpers_1.toISOFormatIfExists)(oldestTootAt),
            homeFeedTimespanHours: numHoursInHomeFeed ? Number(numHoursInHomeFeed.toPrecision(2)) : null,
            isLoading: this.isLoading,
            loadingStatus: this.loadingStatus,
            loadStartedAt: (0, time_helpers_1.toISOFormatIfExists)(this.loadStartedAt),
            minMaxScores: (0, collection_helpers_1.computeMinMax)(this.feed, (toot) => toot.score),
        };
    }
    ///////////////////////////////
    //      Static Methods       //
    ///////////////////////////////
    /** True if {@linkcode FEDIALGO_DEBUG} environment var was set at run time. */
    static get isDebugMode() { return environment_helpers_1.isDebugMode; }
    ;
    /** True if {@linkcode FEDIALGO_DEEP_DEBUG} environment var was set at run time. */
    static get isDeepDebug() { return environment_helpers_1.isDeepDebug; }
    ;
    /** True if {@linkcode LOAD_TEST} environment var was set at run time. */
    static get isLoadTest() { return environment_helpers_1.isLoadTest; }
    ;
    /** True if {@linkcode QUICK_MODE} environment var was set at run time. */
    static get isQuickMode() { return environment_helpers_1.isQuickMode; }
    ;
    /**
     * Dictionary of preset weight configurations that can be selected from to set weights.
     * @returns {WeightPresets}
     */
    static get weightPresets() { return weight_presets_1.WEIGHT_PRESETS; }
    ;
}
exports.default = TheAlgorithm;
;
// Some strings we want to export from the config
const GET_FEED_BUSY_MSG = config_1.config.locale.messages[enums_1.LoadAction.IS_BUSY];
exports.GET_FEED_BUSY_MSG = GET_FEED_BUSY_MSG;
const READY_TO_LOAD_MSG = config_1.config.locale.messages[enums_1.LogAction.INITIAL_LOADING_STATUS];
exports.READY_TO_LOAD_MSG = READY_TO_LOAD_MSG;
//# sourceMappingURL=index.js.map