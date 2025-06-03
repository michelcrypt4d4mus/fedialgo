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
exports.timeString = exports.sortKeysByValue = exports.makePercentileChunks = exports.makeChunks = exports.isValueInStringEnum = exports.isAccessTokenRevokedError = exports.extractDomain = exports.WeightPresetLabel = exports.TypeFilterName = exports.TrendingType = exports.TagTootsCacheKey = exports.ScoreName = exports.NonScoreWeightName = exports.MediaCategory = exports.BooleanFilterName = exports.Toot = exports.TagList = exports.ObjWithCountList = exports.NumericFilter = exports.Logger = exports.BooleanFilter = exports.Account = exports.VIDEO_TYPES = exports.READY_TO_LOAD_MSG = exports.LANGUAGE_CODES = exports.GIFV = exports.GET_FEED_BUSY_MSG = exports.FEDIALGO = exports.FILTER_OPTION_DATA_SOURCES = void 0;
/*
 * Main class that handles scoring and sorting a feed made of Toot objects.
 */
require("reflect-metadata"); // Required for class-transformer
const async_mutex_1 = require("async-mutex");
const account_1 = __importDefault(require("./api/objects/account"));
exports.Account = account_1.default;
const already_shown_scorer_1 = __importDefault(require("./scorer/feature/already_shown_scorer"));
const boolean_filter_1 = __importStar(require("./filters/boolean_filter"));
exports.BooleanFilter = boolean_filter_1.default;
Object.defineProperty(exports, "BooleanFilterName", { enumerable: true, get: function () { return boolean_filter_1.BooleanFilterName; } });
Object.defineProperty(exports, "TypeFilterName", { enumerable: true, get: function () { return boolean_filter_1.TypeFilterName; } });
const chaos_scorer_1 = __importDefault(require("./scorer/feature/chaos_scorer"));
const diversity_feed_scorer_1 = __importDefault(require("./scorer/feed/diversity_feed_scorer"));
const favourited_tags_scorer_1 = __importDefault(require("./scorer/feature/favourited_tags_scorer"));
const followed_accounts_scorer_1 = __importDefault(require("./scorer/feature/followed_accounts_scorer"));
const followed_tags_scorer_1 = __importDefault(require("./scorer/feature/followed_tags_scorer"));
const hashtag_participation_scorer_1 = __importDefault(require("./scorer/feature/hashtag_participation_scorer"));
const image_attachment_scorer_1 = __importDefault(require("./scorer/feature/image_attachment_scorer"));
const interactions_scorer_1 = __importDefault(require("./scorer/feature/interactions_scorer"));
const api_1 = __importStar(require("./api/api"));
Object.defineProperty(exports, "isAccessTokenRevokedError", { enumerable: true, get: function () { return api_1.isAccessTokenRevokedError; } });
const mastodon_server_1 = __importDefault(require("./api/mastodon_server"));
const mentions_followed_scorer_1 = __importDefault(require("./scorer/feature/mentions_followed_scorer"));
const most_favourited_accounts_scorer_1 = __importDefault(require("./scorer/feature/most_favourited_accounts_scorer"));
const most_replied_accounts_scorer_1 = __importDefault(require("./scorer/feature/most_replied_accounts_scorer"));
const most_retooted_accounts_scorer_1 = __importDefault(require("./scorer/feature/most_retooted_accounts_scorer"));
const numeric_filter_1 = __importDefault(require("./filters/numeric_filter"));
exports.NumericFilter = numeric_filter_1.default;
const num_favourites_scorer_1 = __importDefault(require("./scorer/feature/num_favourites_scorer"));
const num_replies_scorer_1 = __importDefault(require("./scorer/feature/num_replies_scorer"));
const num_retoots_scorer_1 = __importDefault(require("./scorer/feature/num_retoots_scorer"));
const obj_with_counts_list_1 = __importDefault(require("./api/obj_with_counts_list"));
exports.ObjWithCountList = obj_with_counts_list_1.default;
const retoots_in_feed_scorer_1 = __importDefault(require("./scorer/feature/retoots_in_feed_scorer"));
const scorer_1 = __importDefault(require("./scorer/scorer"));
const scorer_cache_1 = __importDefault(require("./scorer/scorer_cache"));
const Storage_1 = __importDefault(require("./Storage"));
const tag_list_1 = __importDefault(require("./api/tag_list"));
exports.TagList = tag_list_1.default;
const toot_1 = __importStar(require("./api/objects/toot"));
exports.Toot = toot_1.default;
const toots_for_tags_list_1 = __importDefault(require("./api/toots_for_tags_list"));
const trending_links_scorer_1 = __importDefault(require("./scorer/feature/trending_links_scorer"));
const trending_tags_scorer_1 = __importDefault(require("./scorer/feature/trending_tags_scorer"));
const trending_toots_scorer_1 = __importDefault(require("./scorer/feature/trending_toots_scorer"));
const user_data_1 = __importDefault(require("./api/user_data"));
const video_attachment_scorer_1 = __importDefault(require("./scorer/feature/video_attachment_scorer"));
const time_helpers_1 = require("./helpers/time_helpers");
Object.defineProperty(exports, "timeString", { enumerable: true, get: function () { return time_helpers_1.timeString; } });
const enums_1 = require("./enums");
Object.defineProperty(exports, "TagTootsCacheKey", { enumerable: true, get: function () { return enums_1.TagTootsCacheKey; } });
Object.defineProperty(exports, "FILTER_OPTION_DATA_SOURCES", { enumerable: true, get: function () { return enums_1.FILTER_OPTION_DATA_SOURCES; } });
const log_helpers_1 = require("./helpers/log_helpers");
const feed_filters_1 = require("./filters/feed_filters");
const config_1 = require("./config");
const string_helpers_1 = require("./helpers/string_helpers");
Object.defineProperty(exports, "FEDIALGO", { enumerable: true, get: function () { return string_helpers_1.FEDIALGO; } });
Object.defineProperty(exports, "GIFV", { enumerable: true, get: function () { return string_helpers_1.GIFV; } });
Object.defineProperty(exports, "VIDEO_TYPES", { enumerable: true, get: function () { return string_helpers_1.VIDEO_TYPES; } });
Object.defineProperty(exports, "extractDomain", { enumerable: true, get: function () { return string_helpers_1.extractDomain; } });
const moar_data_poller_1 = require("./api/moar_data_poller");
const environment_helpers_1 = require("./helpers/environment_helpers");
const weight_presets_1 = require("./scorer/weight_presets");
Object.defineProperty(exports, "WeightPresetLabel", { enumerable: true, get: function () { return weight_presets_1.WeightPresetLabel; } });
const language_helper_1 = require("./helpers/language_helper");
Object.defineProperty(exports, "LANGUAGE_CODES", { enumerable: true, get: function () { return language_helper_1.LANGUAGE_CODES; } });
const logger_1 = require("./helpers/logger");
Object.defineProperty(exports, "Logger", { enumerable: true, get: function () { return logger_1.Logger; } });
const enums_2 = require("./enums");
Object.defineProperty(exports, "MediaCategory", { enumerable: true, get: function () { return enums_2.MediaCategory; } });
Object.defineProperty(exports, "TrendingType", { enumerable: true, get: function () { return enums_2.TrendingType; } });
const enums_3 = require("./enums");
Object.defineProperty(exports, "NonScoreWeightName", { enumerable: true, get: function () { return enums_3.NonScoreWeightName; } });
Object.defineProperty(exports, "ScoreName", { enumerable: true, get: function () { return enums_3.ScoreName; } });
const stats_helper_1 = require("./helpers/stats_helper");
const collection_helpers_1 = require("./helpers/collection_helpers");
Object.defineProperty(exports, "isValueInStringEnum", { enumerable: true, get: function () { return collection_helpers_1.isValueInStringEnum; } });
Object.defineProperty(exports, "makeChunks", { enumerable: true, get: function () { return collection_helpers_1.makeChunks; } });
Object.defineProperty(exports, "makePercentileChunks", { enumerable: true, get: function () { return collection_helpers_1.makePercentileChunks; } });
Object.defineProperty(exports, "sortKeysByValue", { enumerable: true, get: function () { return collection_helpers_1.sortKeysByValue; } });
// Strings
const GET_FEED_BUSY_MSG = `called while load is still in progress. Consider using the setTimelineInApp() callback.`;
exports.GET_FEED_BUSY_MSG = GET_FEED_BUSY_MSG;
const FINALIZING_SCORES_MSG = `Finalizing scores`;
const INITIAL_LOAD_STATUS = "Retrieving initial data";
const PULLING_USER_HISTORY = `Pulling your historical data`;
const READY_TO_LOAD_MSG = "Ready to load";
exports.READY_TO_LOAD_MSG = READY_TO_LOAD_MSG;
const EMPTY_TRENDING_DATA = {
    links: [],
    tags: new tag_list_1.default([], enums_1.TagTootsCacheKey.TRENDING_TAG_TOOTS),
    servers: {},
    toots: []
};
const LOAD_STARTED_MSGS = [
    log_helpers_1.BACKFILL_FEED,
    PULLING_USER_HISTORY,
    log_helpers_1.TRIGGER_FEED,
];
// Constants
const REALLY_BIG_NUMBER = 10000000000;
const PULL_USER_HISTORY_PARAMS = { maxRecords: REALLY_BIG_NUMBER, moar: true };
const DEFAULT_SET_TIMELINE_IN_APP = (feed) => console.debug(`Default setTimelineInApp() called`);
;
class TheAlgorithm {
    static isDebugMode = environment_helpers_1.isDebugMode;
    filters = (0, feed_filters_1.buildNewFilterSettings)();
    lastLoadTimeInSeconds = null; // Duration of the last load in seconds
    loadingStatus = READY_TO_LOAD_MSG; // String describing load activity (undefined means load complete)
    logger = new logger_1.Logger(`TheAlgorithm`);
    trendingData = EMPTY_TRENDING_DATA;
    userData = new user_data_1.default();
    weightPresets = JSON.parse(JSON.stringify(weight_presets_1.WEIGHT_PRESETS));
    // Constructor argument variables
    api;
    user;
    setTimelineInApp; // Optional callback to set the feed in the app using this package
    // Other private variables
    feed = [];
    homeFeed = []; // Just the toots pulled from the home timeline
    hasProvidedAnyTootsToClient = false; // Flag to indicate if the feed has been set in the app
    loadStartedAt = null; // Timestamp of when the feed started loading
    numTriggers = 0;
    totalNumTimesShown = 0; // Sum of timeline toots' numTimesShown
    // Mutexess
    mergeMutex = new async_mutex_1.Mutex();
    prepareScorersMutex = new async_mutex_1.Mutex();
    // Background tasks
    cacheUpdater;
    dataPoller;
    // These can score a toot without knowing about the rest of the toots in the feed
    featureScorers = [
        new already_shown_scorer_1.default(),
        new chaos_scorer_1.default(),
        new favourited_tags_scorer_1.default(),
        new followed_accounts_scorer_1.default(),
        new followed_tags_scorer_1.default(),
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
    // These scorers require the complete feed to work properly
    feedScorers = [
        new diversity_feed_scorer_1.default(),
    ];
    weightedScorers = [
        ...this.featureScorers,
        ...this.feedScorers,
    ];
    weightInfo = this.weightedScorers.reduce((scorerInfos, scorer) => {
        scorerInfos[scorer.name] = scorer.getInfo();
        return scorerInfos;
    }, Object.values(enums_3.NonScoreWeightName).reduce((nonScoreWeights, weightName) => {
        nonScoreWeights[weightName] = Object.assign({}, config_1.config.scoring.nonScoreWeightsConfig[weightName]);
        nonScoreWeights[weightName].minValue = config_1.config.scoring.nonScoreWeightMinValue;
        return nonScoreWeights;
    }, {}));
    // Publicly callable constructor() that instantiates the class and loads the feed from storage.
    static async create(params) {
        config_1.config.setLocale(params.locale);
        const user = account_1.default.build(params.user);
        await Storage_1.default.logAppOpen(user);
        // Construct the algorithm object, set the default weights, load feed and filters
        const algo = new TheAlgorithm({ api: params.api, user: user, setTimelineInApp: params.setTimelineInApp });
        scorer_cache_1.default.addScorers(algo.featureScorers, algo.feedScorers);
        await algo.loadCachedData();
        return algo;
    }
    constructor(params) {
        this.api = params.api;
        this.user = params.user;
        this.setTimelineInApp = params.setTimelineInApp ?? DEFAULT_SET_TIMELINE_IN_APP;
        api_1.default.init(this.api, this.user);
    }
    // Trigger the retrieval of the user's timeline from all the sources if maxId is not provided.
    async triggerFeedUpdate(moreOldToots) {
        this.logger.log(`<${log_helpers_1.TRIGGER_FEED}> called, ${++this.numTriggers} triggers so far, state:`, this.statusDict());
        this.checkIfLoading();
        if (moreOldToots)
            return await this.triggerHomeTimelineBackFill();
        if (this.checkIfSkipping())
            return;
        this.setLoadingStateVariables(log_helpers_1.TRIGGER_FEED);
        const hashtagToots = async (key) => {
            const tagList = await toots_for_tags_list_1.default.create(key);
            return await this.fetchAndMergeToots(tagList.getToots(), tagList.logger);
        };
        let dataLoads = [
            this.getHomeTimeline().then((toots) => this.homeFeed = toots),
            this.prepareScorers(),
        ];
        // Sleep to Delay the trending tag etc. toot pulls a bit because they generate a ton of API calls
        await (0, time_helpers_1.sleep)(config_1.config.api.hashtagTootRetrievalDelaySeconds * 1000); // TODO: do we really need to do this sleeping?
        dataLoads = dataLoads.concat([
            this.fetchAndMergeToots(mastodon_server_1.default.fediverseTrendingToots(), new logger_1.Logger(enums_1.CacheKey.FEDIVERSE_TRENDING_TOOTS)),
            hashtagToots(enums_1.TagTootsCacheKey.FAVOURITED_TAG_TOOTS),
            hashtagToots(enums_1.TagTootsCacheKey.PARTICIPATED_TAG_TOOTS),
            hashtagToots(enums_1.TagTootsCacheKey.TRENDING_TAG_TOOTS),
            // Population of instance variables - these are not required to be done before the feed is loaded
            mastodon_server_1.default.getTrendingData().then((trendingData) => this.trendingData = trendingData),
            api_1.default.instance.getUserData().then((userData) => this.userData = userData),
        ]);
        // TODO: do we need a try/finally here? I don't think so because Promise.all() will fail immediately
        // and the load could still be going, but then how do we mark the load as finished?
        const allResults = await Promise.all(dataLoads);
        this.logger.trace(`${(0, string_helpers_1.arrowed)(log_helpers_1.TRIGGER_FEED)} FINISHED promises, allResults:`, allResults);
        await this.finishFeedUpdate();
    }
    // Trigger the loading of additional toots, farther back on the home timeline
    async triggerHomeTimelineBackFill() {
        this.logger.log(`${(0, string_helpers_1.arrowed)(log_helpers_1.BACKFILL_FEED)} called, state:`, this.statusDict());
        this.checkIfLoading();
        this.setLoadingStateVariables(log_helpers_1.BACKFILL_FEED);
        this.homeFeed = await this.getHomeTimeline(true);
        await this.finishFeedUpdate();
    }
    // Collect *ALL* the user's history data from the server - past toots, favourites, etc.
    // Use with caution!
    async triggerPullAllUserData() {
        const logPrefix = (0, string_helpers_1.arrowed)(`triggerPullAllUserData()`);
        this.logger.log(`${logPrefix} called, state:`, this.statusDict());
        this.checkIfLoading();
        this.setLoadingStateVariables(PULLING_USER_HISTORY);
        this.dataPoller && clearInterval(this.dataPoller); // Stop the dataPoller if it's running
        try {
            const _allResults = await Promise.all([
                api_1.default.instance.getFavouritedToots(PULL_USER_HISTORY_PARAMS),
                // TODO: there's just too many notifications to pull all of them
                api_1.default.instance.getNotifications({ maxRecords: config_1.MAX_ENDPOINT_RECORDS_TO_PULL, moar: true }),
                api_1.default.instance.getRecentUserToots(PULL_USER_HISTORY_PARAMS),
            ]);
            await this.recomputeScorers();
            this.logger.log(`${logPrefix} finished`);
        }
        catch (error) {
            api_1.default.throwSanitizedRateLimitError(error, `${logPrefix} Error pulling user data:`);
        }
        finally {
            this.loadingStatus = null; // TODO: should we restart the data poller?
        }
    }
    // Collate all the data sources that are used to populate properties of the same name for each BooleanFilterOption
    // Note this won't always be completely up to date, but it will be close enough for the UI
    filterOptionDataSources() {
        return {
            [enums_1.TagTootsCacheKey.PARTICIPATED_TAG_TOOTS]: this.userData.participatedTags,
            [enums_1.TagTootsCacheKey.TRENDING_TAG_TOOTS]: this.trendingData.tags,
            [enums_1.TagTootsCacheKey.FAVOURITED_TAG_TOOTS]: this.userData.favouritedTags,
            [enums_3.ScoreName.FAVOURITED_ACCOUNTS]: this.userData.favouriteAccounts,
        };
    }
    // Return an object describing the state of the world. Mostly for debugging.
    async getCurrentState() {
        return {
            Algorithm: this.statusDict(),
            Api: { waitTimes: api_1.default.instance.waitTimes },
            Config: config_1.config,
            Filters: this.filters,
            Homeserver: await this.serverInfo(),
            Storage: await Storage_1.default.storedObjsInfo(),
            Trending: this.trendingData,
            UserData: await api_1.default.instance.getUserData(),
        };
    }
    // Return an array of objects suitable for use with Recharts
    getRechartsStatsData(numPercentiles = 5) {
        return (0, stats_helper_1.rechartsDataPoints)(this.feed, numPercentiles);
    }
    // Return the current filtered timeline feed in weight order
    getTimeline() {
        return this.feed;
    }
    // Return the user's current weightings for each score category
    async getUserWeights() {
        return await Storage_1.default.getWeights();
    }
    // TODO: Using loadingStatus as the main determinant of state is kind of janky
    isLoading() {
        return !!(this.loadingStatus && this.loadingStatus != READY_TO_LOAD_MSG);
    }
    // Return the timestamp of the most recent toot from followed accounts + hashtags ONLY
    mostRecentHomeTootAt() {
        // TODO: this.homeFeed is only set when fetchHomeFeed() is *finished*
        if (this.homeFeed.length == 0 && this.numTriggers > 1) {
            this.logger.warn(`mostRecentHomeTootAt() homeFeed is empty, falling back to full feed`);
            return (0, toot_1.mostRecentTootedAt)(this.feed);
        }
        return (0, toot_1.mostRecentTootedAt)(this.homeFeed);
    }
    // Return the number of seconds since the most recent home timeline toot
    mostRecentHomeTootAgeInSeconds() {
        const mostRecentAt = this.mostRecentHomeTootAt();
        if (!mostRecentAt) {
            if (this.feed.length)
                this.logger.warn(`${this.feed.length} toots in feed but no most recent toot found!`);
            return null;
        }
        const feedAgeInSeconds = (0, time_helpers_1.ageInSeconds)(mostRecentAt);
        this.logger.trace(`'feed' is ${(feedAgeInSeconds / 60).toFixed(2)} minutes old, most recent home toot: ${(0, time_helpers_1.timeString)(mostRecentAt)}`);
        return feedAgeInSeconds;
    }
    // Doesn't actually mute the account, just marks it as muted in the userData object
    async refreshMutedAccounts() {
        const logPrefix = (0, string_helpers_1.arrowed)(`refreshMutedAccounts()`);
        this.logger.log(`${logPrefix} called (${Object.keys(this.userData.mutedAccounts).length} current muted accounts)...`);
        const mutedAccounts = await api_1.default.instance.getMutedAccounts({ skipCache: true });
        this.logger.log(`${logPrefix} found ${mutedAccounts.length} muted accounts after refresh...`);
        this.userData.mutedAccounts = account_1.default.buildAccountNames(mutedAccounts);
        (await api_1.default.instance.getUserData()).mutedAccounts = this.userData.mutedAccounts;
        await this.finishFeedUpdate(false);
    }
    // Clear everything from browser storage except the user's identity and weightings (unless complete is true).
    async reset(complete = false) {
        this.logger.warn(`reset() called, clearing all storage...`);
        this.dataPoller && clearInterval(this.dataPoller);
        this.dataPoller = undefined;
        this.cacheUpdater && clearInterval(this.cacheUpdater);
        this.cacheUpdater = undefined;
        this.hasProvidedAnyTootsToClient = false;
        this.loadingStatus = READY_TO_LOAD_MSG;
        this.loadStartedAt = null;
        this.numTriggers = 0;
        this.feed = [];
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
    // Return info about the Fedialgo user's home mastodon instance
    async serverInfo() {
        return await api_1.default.instance.instanceInfo();
    }
    tagUrl(tag) {
        return api_1.default.instance.tagUrl(tag);
    }
    // Update the feed filters and return the newly filtered feed
    updateFilters(newFilters) {
        this.logger.log(`updateFilters() called with newFilters:`, newFilters);
        this.filters = newFilters;
        Storage_1.default.setFilters(newFilters);
        return this.filterFeedAndSetInApp();
    }
    // Update user weightings and rescore / resort the feed.
    async updateUserWeights(userWeights) {
        this.logger.log("updateUserWeights() called with weights:", userWeights);
        await Storage_1.default.setWeightings(userWeights);
        return this.scoreAndFilterFeed();
    }
    // Update user weightings to one of the preset values and rescore / resort the feed.
    async updateUserWeightsToPreset(presetName) {
        this.logger.log("updateUserWeightsToPreset() called with presetName:", presetName);
        if (!(0, weight_presets_1.isWeightPresetLabel)(presetName)) {
            this.logger.logAndThrowError(`Invalid weight preset: "${presetName}"`);
        }
        return await this.updateUserWeights(weight_presets_1.WEIGHT_PRESETS[presetName]);
    }
    ///////////////////////////////
    //      Private Methods      //
    ///////////////////////////////
    // Throw an error if the feed is loading
    checkIfLoading() {
        if (this.isLoading()) {
            this.logger.warn(`${(0, string_helpers_1.arrowed)(log_helpers_1.TRIGGER_FEED)} Load in progress already!`, this.statusDict());
            throw new Error(`${log_helpers_1.TRIGGER_FEED} ${GET_FEED_BUSY_MSG}`);
        }
    }
    // Return true if we're in quick mode and the feed is fresh enough that we don't need to update it (for dev)
    checkIfSkipping() {
        let feedAgeInMinutes = this.mostRecentHomeTootAgeInSeconds();
        if (feedAgeInMinutes)
            feedAgeInMinutes /= 60;
        const maxAgeMinutes = config_1.config.minTrendingMinutesUntilStale();
        if (environment_helpers_1.isQuickMode && feedAgeInMinutes && feedAgeInMinutes < maxAgeMinutes && this.numTriggers <= 1) {
            this.logger.debug(`${(0, string_helpers_1.arrowed)(log_helpers_1.TRIGGER_FEED)} QUICK_MODE Feed is ${feedAgeInMinutes.toFixed(0)}s old, not updating`);
            // Needs to be called to update the feed in the app
            this.prepareScorers().then((_t) => this.filterFeedAndSetInApp());
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
            this.logTelemetry(`fetched ${newToots.length} toots`, startedAt, logger);
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
    async finishFeedUpdate(isDeepInspect = true) {
        const logger = this.logger.tempLogger(`finishFeedUpdate()`);
        this.loadingStatus = FINALIZING_SCORES_MSG;
        logger.debug(`${FINALIZING_SCORES_MSG}...`);
        // Required for refreshing muted accounts  // TODO: this is pretty janky...
        this.feed = await toot_1.default.removeInvalidToots(this.feed, logger);
        // Now that all data has arrived go back over the feed and do the slow calculations of trendingLinks etc.
        await toot_1.default.completeToots(this.feed, logger, isDeepInspect);
        await (0, feed_filters_1.updateBooleanFilterOptions)(this.filters, this.feed);
        //updateHashtagCounts(this.filters, this.feed);  // TODO: this took too long (4 minutes for 3000 toots) but maybe is ok now?
        await this.scoreAndFilterFeed();
        if (this.loadStartedAt) {
            this.logTelemetry(`finished home TL load w/ ${this.feed.length} toots`, this.loadStartedAt);
            this.lastLoadTimeInSeconds = (0, time_helpers_1.ageInSeconds)(this.loadStartedAt);
        }
        else {
            logger.warn(`finished but loadStartedAt is null!`);
        }
        this.loadStartedAt = null;
        this.loadingStatus = null;
        this.launchBackgroundPoller();
    }
    // Simple wrapper for triggering fetchHomeFeed()
    async getHomeTimeline(moreOldToots) {
        return await api_1.default.instance.fetchHomeFeed({
            mergeTootsToFeed: this.lockedMergeToFeed.bind(this),
            moar: moreOldToots
        });
    }
    // Kick off the MOAR data poller to collect more user history data if it doesn't already exist
    launchBackgroundPoller() {
        if (this.dataPoller) {
            moar_data_poller_1.moarDataLogger.log(`data poller already exists, not starting another one`);
            return;
        }
        this.dataPoller = setInterval(async () => {
            const shouldContinue = await (0, moar_data_poller_1.getMoarData)();
            await this.recomputeScorers(); // Force scorers to recompute data, rescore the feed
            if (!shouldContinue) {
                moar_data_poller_1.moarDataLogger.log(`stopping data poller...`);
                this.dataPoller && clearInterval(this.dataPoller);
            }
        }, config_1.config.api.backgroundLoadIntervalMinutes * config_1.SECONDS_IN_MINUTE * 1000);
        if (this.cacheUpdater) {
            moar_data_poller_1.moarDataLogger.log(`cacheUpdater already exists, not starting another one`);
            return;
        }
        this.cacheUpdater = setInterval(async () => await this.updateTootCache(), config_1.config.toots.saveChangesIntervalSeconds * 1000);
    }
    // Load cached data from storage. This is called when the app is first opened and when reset() is called.
    async loadCachedData() {
        this.feed = await Storage_1.default.getCoerced(enums_1.CacheKey.TIMELINE_TOOTS);
        this.homeFeed = await Storage_1.default.getCoerced(enums_1.CacheKey.HOME_TIMELINE_TOOTS);
        this.trendingData = await Storage_1.default.getTrendingData();
        this.userData = await Storage_1.default.loadUserData();
        this.filters = await Storage_1.default.getFilters() ?? (0, feed_filters_1.buildNewFilterSettings)();
        await (0, feed_filters_1.updateBooleanFilterOptions)(this.filters, this.feed);
        this.setTimelineInApp(this.feed);
        this.logger.log(`<loadCachedData()> loaded ${this.feed.length} timeline toots from cache, trendingData`);
    }
    // Apparently if the mutex lock is inside mergeTootsToFeed() then the state of this.feed is not consistent
    // which can result in toots getting lost as threads try to merge newToots into different this.feed states.
    // Wrapping the entire function in a mutex seems to fix this (though i'm not sure why).
    async lockedMergeToFeed(newToots, logger) {
        const releaseMutex = await (0, log_helpers_1.lockExecution)(this.mergeMutex, logger, 'mergeTootsToFeed()');
        try {
            await this.mergeTootsToFeed(newToots, logger);
            logger.trace(`${(0, string_helpers_1.arrowed)(string_helpers_1.SET_LOADING_STATUS)} lockedMergeToFeed() finished mutex`);
        }
        finally {
            releaseMutex();
        }
    }
    ;
    // Log timing info
    logTelemetry(msg, startedAt, logger) {
        (logger || this.logger).logTelemetry(msg, startedAt, 'current state', this.statusDict());
    }
    // Merge newToots into this.feed, score, and filter the feed.
    // NOTE: Don't call this directly! Use lockedMergeTootsToFeed() instead.
    async mergeTootsToFeed(newToots, logger) {
        const startedAt = new Date();
        const numTootsBefore = this.feed.length;
        this.feed = toot_1.default.dedupeToots([...this.feed, ...newToots], logger);
        await (0, feed_filters_1.updateBooleanFilterOptions)(this.filters, this.feed);
        await this.scoreAndFilterFeed();
        this.logTelemetry(`merged ${newToots.length} new toots into ${numTootsBefore}`, startedAt);
        this.setLoadingStateVariables(logger.logPrefix);
    }
    // Prepare the scorers for scoring. If 'force' is true, force recompute of scoringData.
    async prepareScorers(force) {
        const releaseMutex = await (0, log_helpers_1.lockExecution)(this.prepareScorersMutex, this.logger, log_helpers_1.PREP_SCORERS);
        try {
            if (force || this.featureScorers.some(scorer => !scorer.isReady)) {
                const startedAt = new Date();
                await Promise.all(this.featureScorers.map(scorer => scorer.fetchRequiredData()));
                this.logTelemetry(`${this.featureScorers.length} scorers ready`, startedAt, this.logger.tempLogger(log_helpers_1.PREP_SCORERS));
            }
        }
        finally {
            releaseMutex();
        }
    }
    // Recompute the scorers' computations based on user history etc. and trigger a rescore of the feed
    async recomputeScorers() {
        this.userData = await user_data_1.default.build();
        await this.prepareScorers(true); // The "true" arg is the key here
        await this.scoreAndFilterFeed();
    }
    // Score the feed, sort it, save it to storage, and call filterFeed() to update the feed in the app
    // Returns the FILTERED set of toots (NOT the entire feed!)
    async scoreAndFilterFeed() {
        await this.prepareScorers(); // Make sure the scorers are ready to go
        this.feed = await scorer_1.default.scoreToots(this.feed, true);
        this.feed = (0, collection_helpers_1.truncateToConfiguredLength)(this.feed, config_1.config.toots.maxTimelineLength, this.logger.tempLogger('scoreAndFilterFeed()'));
        await Storage_1.default.set(enums_1.CacheKey.TIMELINE_TOOTS, this.feed);
        return this.filterFeedAndSetInApp();
    }
    // sets this.loadingStatus to a message indicating the current state of the feed
    setLoadingStateVariables(logPrefix) {
        if (LOAD_STARTED_MSGS.includes(logPrefix))
            this.loadStartedAt = new Date();
        // If feed is empty then it's an initial load, otherwise it's a catchup if TRIGGER_FEED
        if (!this.feed.length) {
            this.loadingStatus = INITIAL_LOAD_STATUS;
        }
        else if (logPrefix == log_helpers_1.BACKFILL_FEED) {
            this.loadingStatus = `Loading older home timeline toots`;
        }
        else if (logPrefix == PULLING_USER_HISTORY) {
            this.loadingStatus = PULLING_USER_HISTORY;
        }
        else if (this.homeFeed.length > 0) {
            const mostRecentAt = this.mostRecentHomeTootAt();
            this.loadingStatus = `Loading new toots` + (mostRecentAt ? ` since ${(0, time_helpers_1.timeString)(mostRecentAt)}` : '');
        }
        else {
            this.loadingStatus = `Loading more toots (retrieved ${this.feed.length.toLocaleString()} toots so far)`;
        }
        this.logger.trace(`<${string_helpers_1.SET_LOADING_STATUS}) ${logPrefix}`, `setLoadingStateVariables()`, this.statusDict());
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
            isLoading: this.isLoading(),
            loadingStatus: this.loadingStatus,
            minMaxScores: (0, collection_helpers_1.computeMinMax)(this.feed, (toot) => toot.scoreInfo?.score),
        };
    }
    // Save the current timeline to the browser storage. Used to save the state of toots' numTimesShown.
    async updateTootCache() {
        if (this.isLoading())
            return;
        const logPrefix = (0, string_helpers_1.arrowed)(`updateTootCache()`);
        const newTotalNumTimesShown = this.feed.reduce((sum, toot) => sum + (toot.numTimesShown ?? 0), 0);
        if (this.totalNumTimesShown == newTotalNumTimesShown)
            return;
        try {
            const numShownToots = this.feed.filter(toot => toot.numTimesShown).length;
            const msg = `${logPrefix} saving ${this.feed.length} toots with ${newTotalNumTimesShown} times shown`;
            this.logger.debug(`${msg} on ${numShownToots} toots (previous totalNumTimesShown: ${this.totalNumTimesShown})`);
            await Storage_1.default.set(enums_1.CacheKey.TIMELINE_TOOTS, this.feed);
            this.totalNumTimesShown = newTotalNumTimesShown;
        }
        catch (error) {
            this.logger.error(`${logPrefix} Error saving toots:`, error);
        }
    }
}
;
exports.default = TheAlgorithm;
//# sourceMappingURL=index.js.map