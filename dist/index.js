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
exports.timeString = exports.sortKeysByValue = exports.isValueInStringEnum = exports.isDebugMode = exports.isAccessTokenRevokedError = exports.formatScore = exports.extractDomain = exports.WeightPresetLabel = exports.WeightName = exports.TypeFilterName = exports.MediaCategory = exports.BooleanFilterName = exports.Toot = exports.NumericFilter = exports.BooleanFilter = exports.Account = exports.VIDEO_TYPES = exports.READY_TO_LOAD_MSG = exports.NON_SCORE_WEIGHTS = exports.GIFV = exports.GET_FEED_BUSY_MSG = exports.FEDIALGO = void 0;
/*
 * Main class that handles scoring and sorting a feed made of Toot objects.
 */
require("reflect-metadata"); // Required for class-transformer
const async_mutex_1 = require("async-mutex");
const account_1 = __importDefault(require("./api/objects/account"));
exports.Account = account_1.default;
const boolean_filter_1 = __importStar(require("./filters/boolean_filter"));
exports.BooleanFilter = boolean_filter_1.default;
Object.defineProperty(exports, "BooleanFilterName", { enumerable: true, get: function () { return boolean_filter_1.BooleanFilterName; } });
Object.defineProperty(exports, "TypeFilterName", { enumerable: true, get: function () { return boolean_filter_1.TypeFilterName; } });
const chaos_scorer_1 = __importDefault(require("./scorer/feature/chaos_scorer"));
const diversity_feed_scorer_1 = __importDefault(require("./scorer/feed/diversity_feed_scorer"));
const favourited_tags_scorer_1 = __importDefault(require("./scorer/feature/favourited_tags_scorer"));
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
const retoots_in_feed_scorer_1 = __importDefault(require("./scorer/feature/retoots_in_feed_scorer"));
const scorer_1 = __importStar(require("./scorer/scorer"));
Object.defineProperty(exports, "formatScore", { enumerable: true, get: function () { return scorer_1.formatScore; } });
const scorer_cache_1 = __importDefault(require("./scorer/scorer_cache"));
const Storage_1 = __importDefault(require("./Storage"));
const toot_1 = __importStar(require("./api/objects/toot"));
exports.Toot = toot_1.default;
const trending_links_scorer_1 = __importDefault(require("./scorer/feature/trending_links_scorer"));
const trending_tags_scorer_1 = __importDefault(require("./scorer/feature/trending_tags_scorer"));
const trending_toots_scorer_1 = __importDefault(require("./scorer/feature/trending_toots_scorer"));
const user_data_1 = __importDefault(require("./api/user_data"));
const video_attachment_scorer_1 = __importDefault(require("./scorer/feature/video_attachment_scorer"));
const time_helpers_1 = require("./helpers/time_helpers");
Object.defineProperty(exports, "timeString", { enumerable: true, get: function () { return time_helpers_1.timeString; } });
const feed_filters_1 = require("./filters/feed_filters");
const config_1 = require("./config");
const string_helpers_1 = require("./helpers/string_helpers");
Object.defineProperty(exports, "FEDIALGO", { enumerable: true, get: function () { return string_helpers_1.FEDIALGO; } });
Object.defineProperty(exports, "GIFV", { enumerable: true, get: function () { return string_helpers_1.GIFV; } });
Object.defineProperty(exports, "VIDEO_TYPES", { enumerable: true, get: function () { return string_helpers_1.VIDEO_TYPES; } });
Object.defineProperty(exports, "extractDomain", { enumerable: true, get: function () { return string_helpers_1.extractDomain; } });
const moar_data_poller_1 = require("./api/moar_data_poller");
const hashtags_1 = require("./feeds/hashtags");
const environment_helpers_1 = require("./helpers/environment_helpers");
Object.defineProperty(exports, "isDebugMode", { enumerable: true, get: function () { return environment_helpers_1.isDebugMode; } });
const collection_helpers_1 = require("./helpers/collection_helpers");
Object.defineProperty(exports, "isValueInStringEnum", { enumerable: true, get: function () { return collection_helpers_1.isValueInStringEnum; } });
Object.defineProperty(exports, "sortKeysByValue", { enumerable: true, get: function () { return collection_helpers_1.sortKeysByValue; } });
const weight_presets_1 = require("./scorer/weight_presets");
Object.defineProperty(exports, "WeightPresetLabel", { enumerable: true, get: function () { return weight_presets_1.WeightPresetLabel; } });
const log_helpers_1 = require("./helpers/log_helpers");
const types_1 = require("./types");
Object.defineProperty(exports, "NON_SCORE_WEIGHTS", { enumerable: true, get: function () { return types_1.NON_SCORE_WEIGHTS; } });
Object.defineProperty(exports, "MediaCategory", { enumerable: true, get: function () { return types_1.MediaCategory; } });
Object.defineProperty(exports, "WeightName", { enumerable: true, get: function () { return types_1.WeightName; } });
// Strings
const GET_FEED_BUSY_MSG = `called while load is still in progress. Consider using the setTimelineInApp() callback.`;
exports.GET_FEED_BUSY_MSG = GET_FEED_BUSY_MSG;
const FINALIZING_SCORES_MSG = `Finalizing scores`;
const INITIAL_LOAD_STATUS = "Retrieving initial data";
const PULLING_USER_HISTORY = `Pulling your historical data`;
const READY_TO_LOAD_MSG = "Ready to load";
exports.READY_TO_LOAD_MSG = READY_TO_LOAD_MSG;
const LOAD_STARTED_MSGS = [
    log_helpers_1.BACKFILL_FEED,
    PULLING_USER_HISTORY,
    log_helpers_1.TRIGGER_FEED,
];
// Constants
const DEFAULT_SET_TIMELINE_IN_APP = (feed) => console.debug(`Default setTimelineInApp() called`);
const REALLY_BIG_NUMBER = 10000000000;
const PULL_USER_HISTORY_PARAMS = { maxRecords: REALLY_BIG_NUMBER, moar: true };
;
class TheAlgorithm {
    static isDebugMode = environment_helpers_1.isDebugMode;
    filters = (0, feed_filters_1.buildNewFilterSettings)();
    lastLoadTimeInSeconds = null; // Duration of the last load in seconds
    loadingStatus = READY_TO_LOAD_MSG; // String describing load activity (undefined means load complete)
    mastodonServers = {};
    trendingData = { links: [], tags: [], toots: [] };
    userData = new user_data_1.default();
    weightPresets = JSON.parse(JSON.stringify(weight_presets_1.WEIGHT_PRESETS));
    // Constructor argument variables
    api;
    user;
    setTimelineInApp; // Optional callback to set the feed in the app using this package
    // Other private variables
    feed = [];
    homeFeed = []; // Just the toots pulled from the home timeline
    dataPoller;
    hasProvidedAnyTootsToClient = false; // Flag to indicate if the feed has been set in the app
    loadStartedAt = null; // Timestamp of when the feed started loading
    numTriggers = 0;
    mergeMutex = new async_mutex_1.Mutex();
    scoreMutex = new async_mutex_1.Mutex();
    // These can score a toot without knowing about the rest of the toots in the feed
    featureScorers = [
        new chaos_scorer_1.default(),
        new favourited_tags_scorer_1.default(),
        new followed_tags_scorer_1.default(),
        new hashtag_participation_scorer_1.default(),
        new mentions_followed_scorer_1.default(),
        new image_attachment_scorer_1.default(),
        new interactions_scorer_1.default(),
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
    }, types_1.NON_SCORE_WEIGHTS.reduce((specialScoreInfos, weightName) => {
        specialScoreInfos[weightName] = Object.assign({}, config_1.Config.weightsConfig[weightName]);
        return specialScoreInfos;
    }, {}));
    // Publicly callable constructor() that instantiates the class and loads the feed from storage.
    static async create(params) {
        (0, config_1.setLocale)(params.locale);
        const user = account_1.default.build(params.user);
        await Storage_1.default.setIdentity(user);
        await Storage_1.default.logAppOpen();
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
        (0, log_helpers_1.logInfo)(log_helpers_1.TRIGGER_FEED, `called, ${++this.numTriggers} triggers so far, state:`, this.statusDict());
        this.checkIfLoading();
        if (moreOldToots)
            return await this.triggerHomeTimelineBackFill();
        if (this.checkIfSkipping())
            return;
        this.setLoadingStateVariables(log_helpers_1.TRIGGER_FEED);
        let dataLoads = [
            this.getHomeTimeline().then((toots) => this.homeFeed = toots),
            this.prepareScorers(),
        ];
        // Sleep to Delay the trending tag etc. toot pulls a bit because they generate a ton of API calls
        await (0, time_helpers_1.sleep)(config_1.Config.hashtagTootRetrievalDelaySeconds); // TODO: do we really need to do this sleeping?
        dataLoads = dataLoads.concat([
            this.fetchAndMergeToots(hashtags_1.getParticipatedHashtagToots),
            this.fetchAndMergeToots(hashtags_1.getRecentTootsForTrendingTags),
            this.fetchAndMergeToots(mastodon_server_1.default.fediverseTrendingToots.bind(mastodon_server_1.default)),
            // Population of instance variables - these are not required to be done before the feed is loaded
            mastodon_server_1.default.getMastodonInstancesInfo().then((servers) => this.mastodonServers = servers),
            mastodon_server_1.default.getTrendingData().then((trendingData) => this.trendingData = trendingData),
            api_1.default.instance.getUserData().then((userData) => this.userData = userData),
        ]);
        // TODO: do we need a try/finally here? I don't think so because Promise.all() will fail immediately
        // and the load could still be going, but then how do we mark the load as finished?
        const allResults = await Promise.all(dataLoads);
        (0, log_helpers_1.traceLog)(`[${log_helpers_1.TRIGGER_FEED}] FINISHED promises, allResults:`, allResults);
        await this.finishFeedUpdate();
    }
    // Trigger the loading of additional toots, farther back on the home timeline
    async triggerHomeTimelineBackFill() {
        console.log(`${(0, string_helpers_1.bracketed)(log_helpers_1.BACKFILL_FEED)} called, state:`, this.statusDict());
        this.checkIfLoading();
        this.setLoadingStateVariables(log_helpers_1.BACKFILL_FEED);
        this.homeFeed = await this.getHomeTimeline(true);
        await this.finishFeedUpdate();
    }
    // Collect *ALL* the user's history data from the server - past toots, favourites, etc.
    // Use with caution!
    async triggerPullAllUserData() {
        const logPrefix = (0, string_helpers_1.bracketed)(`triggerPullAllUserData()`);
        console.log(`${logPrefix} called, state:`, this.statusDict());
        this.checkIfLoading();
        this.setLoadingStateVariables(PULLING_USER_HISTORY);
        this.dataPoller && clearInterval(this.dataPoller); // Stop the dataPoller if it's running
        try {
            const _allResults = await Promise.all([
                api_1.default.instance.getFavouritedToots(PULL_USER_HISTORY_PARAMS),
                api_1.default.instance.getNotifications({ maxRecords: config_1.MAX_ENDPOINT_RECORDS_TO_PULL, moar: true }),
                // MastoApi.instance.getNotifications(moarParams),
                api_1.default.instance.getRecentUserToots(PULL_USER_HISTORY_PARAMS),
            ]);
            // traceLog(`${logPrefix} FINISHED, allResults:`, allResults);
            await this.recomputeScorers();
            console.log(`${logPrefix} finished`);
        }
        catch (error) {
            api_1.default.throwSanitizedRateLimitError(error, `${logPrefix} Error pulling user data:`);
        }
        finally {
            this.loadingStatus = null; // TODO: should we restart the data poller?
        }
    }
    // Return an object describing the state of the world. Mostly for debugging.
    async getCurrentState() {
        return {
            Algorithm: this.statusDict(),
            Config: config_1.Config,
            Storage: await Storage_1.default.storedObjsInfo(),
            UserData: await api_1.default.instance.getUserData(),
        };
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
            console.warn(`mostRecentHomeTootAt() homeFeed is empty, falling back to full feed`);
            return (0, toot_1.mostRecentTootedAt)(this.feed);
        }
        return (0, toot_1.mostRecentTootedAt)(this.homeFeed);
    }
    // Return the number of seconds since the most recent home timeline toot
    mostRecentHomeTootAgeInSeconds() {
        const mostRecentAt = this.mostRecentHomeTootAt();
        if (!mostRecentAt) {
            if (this.feed.length)
                console.warn(`${this.feed.length} toots in feed but no most recent toot found!`);
            return null;
        }
        const feedAgeInSeconds = (0, time_helpers_1.ageInSeconds)(mostRecentAt);
        (0, log_helpers_1.traceLog)(`TheAlgorithm.feed is ${(feedAgeInSeconds / 60).toFixed(2)} minutes old, most recent home toot: ${(0, time_helpers_1.timeString)(mostRecentAt)}`);
        return feedAgeInSeconds;
    }
    // Doesn't actually mute the account, just marks it as muted in the userData object
    async refreshMutedAccounts() {
        const logPrefix = (0, string_helpers_1.bracketed)(`refreshMutedAccounts()`);
        console.log(`${logPrefix} called (${Object.keys(this.userData.mutedAccounts).length} current muted accounts)...`);
        const mutedAccounts = await api_1.default.instance.getMutedAccounts({ skipCache: true });
        console.log(`${logPrefix} found ${mutedAccounts.length} muted accounts after refresh...`);
        this.userData.mutedAccounts = account_1.default.buildAccountNames(mutedAccounts);
        (await api_1.default.instance.getUserData()).mutedAccounts = this.userData.mutedAccounts;
        await this.finishFeedUpdate(false);
    }
    // Clear everything from browser storage except the user's identity and weightings
    async reset() {
        console.warn(`reset() called, clearing all storage...`);
        api_1.default.instance.setSemaphoreConcurrency(config_1.Config.maxConcurrentRequestsInitial);
        this.dataPoller && clearInterval(this.dataPoller);
        this.dataPoller = undefined;
        this.hasProvidedAnyTootsToClient = false;
        this.loadingStatus = READY_TO_LOAD_MSG;
        this.loadStartedAt = null;
        this.mastodonServers = {};
        this.feed = [];
        this.numTriggers = 0;
        await Storage_1.default.clearAll();
        await this.loadCachedData();
    }
    tagUrl(tag) {
        return api_1.default.instance.tagUrl(tag);
    }
    // Update the feed filters and return the newly filtered feed
    updateFilters(newFilters) {
        console.log(`updateFilters() called with newFilters:`, newFilters);
        this.filters = newFilters;
        Storage_1.default.setFilters(newFilters);
        return this.filterFeedAndSetInApp();
    }
    // Update user weightings and rescore / resort the feed.
    async updateUserWeights(userWeights) {
        console.log("updateUserWeights() called with weights:", userWeights);
        await Storage_1.default.setWeightings(userWeights);
        return this.scoreAndFilterFeed();
    }
    // Update user weightings to one of the preset values and rescore / resort the feed.
    async updateUserWeightsToPreset(presetName) {
        console.log("updateUserWeightsToPreset() called with presetName:", presetName);
        if (!(0, weight_presets_1.isWeightPresetLabel)(presetName))
            (0, log_helpers_1.logAndThrowError)(`Invalid weight preset: "${presetName}"`);
        return await this.updateUserWeights(weight_presets_1.WEIGHT_PRESETS[presetName]);
    }
    // Throw an error if the feed is loading
    checkIfLoading() {
        if (this.isLoading()) {
            console.warn(`[${log_helpers_1.TRIGGER_FEED}] Load in progress already!`, this.statusDict());
            throw new Error(`${log_helpers_1.TRIGGER_FEED} ${GET_FEED_BUSY_MSG}`);
        }
    }
    // Return true if we're in quick mode and the feed is fresh enough that we don't need to update it (for dev)
    checkIfSkipping() {
        let feedAgeInMinutes = this.mostRecentHomeTootAgeInSeconds();
        if (feedAgeInMinutes)
            feedAgeInMinutes /= 60;
        if (environment_helpers_1.isQuickMode && feedAgeInMinutes && feedAgeInMinutes < config_1.Config.staleDataTrendingMinutes && this.numTriggers <= 1) {
            console.debug(`[${log_helpers_1.TRIGGER_FEED}] QUICK_MODE Feed is fresh (${feedAgeInMinutes.toFixed(0)}s old), not updating`);
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
    async fetchAndMergeToots(tootFetcher) {
        const logPrefix = tootFetcher.name;
        const startedAt = new Date();
        let newToots = [];
        try {
            newToots = await tootFetcher();
            this.logTelemetry(logPrefix, `fetched ${newToots.length} toots`, startedAt);
        }
        catch (e) {
            api_1.default.throwIfAccessTokenRevoked(e, `${logPrefix} Error fetching toots ${(0, time_helpers_1.ageString)(startedAt)}`);
        }
        await this.lockedMergeToFeed(newToots, logPrefix);
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
            this.logTelemetry('filterFeedAndSetInApp', msg, this.loadStartedAt || new Date());
        }
        return filteredFeed;
    }
    // The "load is finished" version of setLoadingStateVariables().
    async finishFeedUpdate(isDeepInspect = true) {
        // Now that all data has arrived, go back over and do the slow calculations of Toot.trendingLinks etc.
        const logPrefix = (0, string_helpers_1.bracketed)(`${string_helpers_1.SET_LOADING_STATUS} finishFeedUpdate()`);
        this.loadingStatus = FINALIZING_SCORES_MSG;
        console.debug(`${logPrefix} ${FINALIZING_SCORES_MSG}...`);
        await toot_1.default.completeToots(this.feed, log_helpers_1.TRIGGER_FEED + " DEEP", isDeepInspect);
        this.feed = await toot_1.default.removeInvalidToots(this.feed, logPrefix); // Required for refreshing muted accounts
        (0, feed_filters_1.updateBooleanFilterOptions)(this.filters, this.feed);
        //updateHashtagCounts(this.filters, this.feed);  // TODO: this takes too long (4 minutes for 3000 toots)
        await this.scoreAndFilterFeed();
        this.loadingStatus = null;
        if (this.loadStartedAt) {
            this.logTelemetry(logPrefix, `finished home TL load w/ ${this.feed.length} toots`, this.loadStartedAt);
            this.lastLoadTimeInSeconds = (0, time_helpers_1.ageInSeconds)(this.loadStartedAt);
        }
        else {
            console.warn(`${logPrefix} ${string_helpers_1.TELEMETRY} finished but loadStartedAt is null!`);
            // this.lastLoadTimeInSeconds = null;
        }
        this.loadStartedAt = null;
        api_1.default.instance.setSemaphoreConcurrency(config_1.Config.maxConcurrentRequestsBackground);
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
            console.log(`${moar_data_poller_1.MOAR_DATA_PREFIX} data poller already exists, not starting another one`);
            return;
        }
        this.dataPoller = setInterval(async () => {
            const shouldContinue = await (0, moar_data_poller_1.getMoarData)();
            await this.recomputeScorers(); // Force scorers to recompute data, rescore the feed
            if (!shouldContinue) {
                (0, log_helpers_1.logInfo)(moar_data_poller_1.MOAR_DATA_PREFIX, `stopping data poller...`);
                this.dataPoller && clearInterval(this.dataPoller);
            }
        }, config_1.Config.backgroundLoadIntervalSeconds * 1000);
    }
    // Load cached data from storage. This is called when the app is first opened and when reset() is called.
    async loadCachedData() {
        this.feed = await Storage_1.default.getCoerced(types_1.StorageKey.TIMELINE);
        this.homeFeed = await Storage_1.default.getCoerced(types_1.StorageKey.HOME_TIMELINE);
        this.mastodonServers = (await Storage_1.default.get(types_1.StorageKey.FEDIVERSE_POPULAR_SERVERS) || {});
        this.trendingData = await Storage_1.default.getTrendingData();
        this.userData = await Storage_1.default.loadUserData();
        this.filters = await Storage_1.default.getFilters() ?? (0, feed_filters_1.buildNewFilterSettings)();
        (0, feed_filters_1.updateBooleanFilterOptions)(this.filters, this.feed);
        this.setTimelineInApp(this.feed);
        console.log(`[fedialgo] loadCachedData() loaded ${this.feed.length} timeline toots from cache, trendingData`);
    }
    // Apparently if the mutex lock is inside mergeTootsToFeed() then the state of this.feed is not consistent
    // which can result in toots getting lost as threads try to merge newToots into different this.feed states.
    // Wrapping the entire function in a mutex seems to fix this (though i'm not sure why).
    async lockedMergeToFeed(newToots, logPrefix) {
        const releaseMutex = await (0, log_helpers_1.lockExecution)(this.mergeMutex, logPrefix);
        try {
            await this.mergeTootsToFeed(newToots, logPrefix);
            (0, log_helpers_1.traceLog)(`[${string_helpers_1.SET_LOADING_STATUS}] ${logPrefix} lockedMergeToFeed() finished mutex`);
        }
        finally {
            releaseMutex();
        }
    }
    ;
    // Log timing info
    logTelemetry(logPrefix, msg, startedAt) {
        (0, log_helpers_1.logTelemetry)(logPrefix, msg, startedAt, 'current state', this.statusDict());
    }
    // Merge newToots into this.feed, score, and filter the feed.
    // NOTE: Don't call this directly! Use lockedMergeTootsToFeed() instead.
    async mergeTootsToFeed(newToots, logPrefix) {
        const startedAt = new Date();
        const numTootsBefore = this.feed.length;
        this.feed = toot_1.default.dedupeToots([...this.feed, ...newToots], logPrefix);
        (0, feed_filters_1.updateBooleanFilterOptions)(this.filters, this.feed);
        await this.scoreAndFilterFeed();
        this.logTelemetry(logPrefix, `merged ${newToots.length} new toots into ${numTootsBefore}`, startedAt);
        this.setLoadingStateVariables(logPrefix);
    }
    // Prepare the scorers for scoring. If 'force' is true, force them to recompute data even if they are already ready.
    async prepareScorers(force) {
        const releaseMutex = await (0, log_helpers_1.lockExecution)(this.scoreMutex, log_helpers_1.PREP_SCORERS);
        try {
            if (force || this.featureScorers.some(scorer => !scorer.isReady)) {
                const startedAt = new Date();
                await Promise.all(this.featureScorers.map(scorer => scorer.fetchRequiredData()));
                this.logTelemetry(log_helpers_1.PREP_SCORERS, `${this.featureScorers.length} scorers ready`, startedAt);
            }
        }
        finally {
            releaseMutex();
        }
    }
    // Recompute the scorers' computations based on user history etc. and trigger a rescore of the feed
    async recomputeScorers() {
        await this.userData.populate();
        await this.prepareScorers(true); // The "true" arg is the key here
        await this.scoreAndFilterFeed();
    }
    // Score the feed, sort it, save it to storage, and call filterFeed() to update the feed in the app
    // Returns the FILTERED set of toots (NOT the entire feed!)
    async scoreAndFilterFeed() {
        await this.prepareScorers(); // Make sure the scorers are ready to go
        this.feed = await scorer_1.default.scoreToots(this.feed, true);
        this.feed = (0, collection_helpers_1.truncateToConfiguredLength)(this.feed, "maxCachedTimelineToots");
        await Storage_1.default.set(types_1.StorageKey.TIMELINE, this.feed);
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
        (0, log_helpers_1.logDebug)(`[${string_helpers_1.SET_LOADING_STATUS}] ${logPrefix}`, `setLoadingStateVariables()`, this.statusDict());
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
            minMaxScores: (0, collection_helpers_1.getMinMax)(this.feed, (toot) => toot.scoreInfo?.score),
        };
    }
}
;
exports.default = TheAlgorithm;
//# sourceMappingURL=index.js.map