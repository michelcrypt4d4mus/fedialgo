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
exports.timeString = exports.extractDomain = exports.WeightName = exports.TypeFilterName = exports.Toot = exports.TheAlgorithm = exports.PropertyName = exports.PropertyFilter = exports.PresetWeights = exports.PresetWeightLabel = exports.NumericFilter = exports.MediaCategory = exports.Account = exports.VIDEO_TYPES = exports.READY_TO_LOAD_MSG = exports.NON_SCORE_WEIGHTS = exports.GIFV = void 0;
/*
 * Main class that handles scoring and sorting a feed made of Toot objects.
 */
require("reflect-metadata"); // Required for class-transformer
const async_mutex_1 = require("async-mutex");
const account_1 = __importDefault(require("./api/objects/account"));
exports.Account = account_1.default;
const chaos_scorer_1 = __importDefault(require("./scorer/feature/chaos_scorer"));
const diversity_feed_scorer_1 = __importDefault(require("./scorer/feed/diversity_feed_scorer"));
const followed_tags_scorer_1 = __importDefault(require("./scorer/feature/followed_tags_scorer"));
const hashtag_participation_scorer_1 = __importDefault(require("./scorer/feature/hashtag_participation_scorer"));
const image_attachment_scorer_1 = __importDefault(require("./scorer/feature/image_attachment_scorer"));
const interactions_scorer_1 = __importDefault(require("./scorer/feature/interactions_scorer"));
const api_1 = __importDefault(require("./api/api"));
const mastodon_server_1 = __importDefault(require("./api/mastodon_server"));
const mentions_followed_scorer_1 = __importDefault(require("./scorer/feature/mentions_followed_scorer"));
const most_favorited_accounts_scorer_1 = __importDefault(require("./scorer/feature/most_favorited_accounts_scorer"));
const most_replied_accounts_scorer_1 = __importDefault(require("./scorer/feature/most_replied_accounts_scorer"));
const most_retooted_users_scorer_1 = __importDefault(require("./scorer/feature/most_retooted_users_scorer"));
const numeric_filter_1 = __importDefault(require("./filters/numeric_filter"));
exports.NumericFilter = numeric_filter_1.default;
const num_favorites_scorer_1 = __importDefault(require("./scorer/feature/num_favorites_scorer"));
const num_replies_scorer_1 = __importDefault(require("./scorer/feature/num_replies_scorer"));
const num_retoots_scorer_1 = __importDefault(require("./scorer/feature/num_retoots_scorer"));
const property_filter_1 = __importStar(require("./filters/property_filter"));
exports.PropertyFilter = property_filter_1.default;
Object.defineProperty(exports, "PropertyName", { enumerable: true, get: function () { return property_filter_1.PropertyName; } });
Object.defineProperty(exports, "TypeFilterName", { enumerable: true, get: function () { return property_filter_1.TypeFilterName; } });
const retoots_in_feed_scorer_1 = __importDefault(require("./scorer/feature/retoots_in_feed_scorer"));
const scorer_1 = __importDefault(require("./scorer/scorer"));
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
const collection_helpers_1 = require("./helpers/collection_helpers");
const poller_1 = require("./api/poller");
const hashtags_1 = require("./feeds/hashtags");
const string_helpers_1 = require("./helpers/string_helpers");
Object.defineProperty(exports, "GIFV", { enumerable: true, get: function () { return string_helpers_1.GIFV; } });
Object.defineProperty(exports, "VIDEO_TYPES", { enumerable: true, get: function () { return string_helpers_1.VIDEO_TYPES; } });
Object.defineProperty(exports, "extractDomain", { enumerable: true, get: function () { return string_helpers_1.extractDomain; } });
const log_helpers_1 = require("./helpers/log_helpers");
const weight_presets_1 = require("./scorer/weight_presets");
Object.defineProperty(exports, "PresetWeightLabel", { enumerable: true, get: function () { return weight_presets_1.PresetWeightLabel; } });
Object.defineProperty(exports, "PresetWeights", { enumerable: true, get: function () { return weight_presets_1.PresetWeights; } });
const types_1 = require("./types");
Object.defineProperty(exports, "NON_SCORE_WEIGHTS", { enumerable: true, get: function () { return types_1.NON_SCORE_WEIGHTS; } });
Object.defineProperty(exports, "MediaCategory", { enumerable: true, get: function () { return types_1.MediaCategory; } });
Object.defineProperty(exports, "WeightName", { enumerable: true, get: function () { return types_1.WeightName; } });
const DEFAULT_SET_TIMELINE_IN_APP = (feed) => console.debug(`Default setTimelineInApp() called`);
const GET_FEED_BUSY_MSG = `called while load is still in progress. Consider using the setTimelineInApp() callback.`;
// TODO: The demo app prefixes these with "Loading (msg)..." which is not ideal
const INITIAL_LOAD_STATUS = "initial data";
const READY_TO_LOAD_MSG = "(ready to load)";
exports.READY_TO_LOAD_MSG = READY_TO_LOAD_MSG;
;
class TheAlgorithm {
    filters = (0, feed_filters_1.buildNewFilterSettings)();
    lastLoadTimeInSeconds = null; // Duration of the last load in seconds
    // TODO: loadingStatus has become the main flag for whether the feed is loading or not. Not great.
    loadingStatus = READY_TO_LOAD_MSG; // String describing load activity (undefined means load complete)
    mastodonServers = {};
    trendingData = { links: [], tags: [], toots: [] };
    userData = new user_data_1.default();
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
    mergeMutex = new async_mutex_1.Mutex();
    scoreMutex = new async_mutex_1.Mutex();
    // These can score a toot without knowing about the rest of the toots in the feed
    featureScorers = [
        new chaos_scorer_1.default(),
        new followed_tags_scorer_1.default(),
        new hashtag_participation_scorer_1.default(),
        new mentions_followed_scorer_1.default(),
        new image_attachment_scorer_1.default(),
        new interactions_scorer_1.default(),
        new most_favorited_accounts_scorer_1.default(),
        new most_replied_accounts_scorer_1.default(),
        new most_retooted_users_scorer_1.default(),
        new num_favorites_scorer_1.default(),
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
    scorersDict = this.weightedScorers.reduce((scorerInfos, scorer) => {
        scorerInfos[scorer.name] = scorer.getInfo();
        return scorerInfos;
    }, types_1.NON_SCORE_WEIGHTS.reduce((specialScoreInfos, weightName) => {
        specialScoreInfos[weightName] = Object.assign({}, config_1.SCORERS_CONFIG[weightName]);
        return specialScoreInfos;
    }, {}));
    // Publicly callable constructor() that instantiates the class and loads the feed from storage.
    static async create(params) {
        if (params.language) {
            if (params.language in config_1.Config.foreignLanguageServers) {
                config_1.Config.language = params.language;
            }
            else {
                console.warn(`Language ${params.language} not supported, using default ${config_1.Config.defaultLanguage}`);
            }
        }
        const user = account_1.default.build(params.user);
        await Storage_1.default.setIdentity(user);
        await Storage_1.default.logAppOpen();
        // Construct the algorithm object, set the default weights, load feed and filters
        const algo = new TheAlgorithm({ api: params.api, user: user, setTimelineInApp: params.setTimelineInApp });
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
    async triggerFeedUpdate() {
        (0, log_helpers_1.logInfo)(log_helpers_1.TRIGGER_FEED, `called, state:`, this.statusDict());
        if (this.isLoading())
            (0, log_helpers_1.logAndThrowError)(`[${log_helpers_1.TRIGGER_FEED}] ${GET_FEED_BUSY_MSG}`);
        this.setLoadingStateVariables(log_helpers_1.TRIGGER_FEED);
        const initialLoads = [
            this.prepareScorers(),
            api_1.default.instance.fetchHomeFeed(this.lockedMergeTootsToFeed.bind(this), config_1.Config.numDesiredTimelineToots)
                .then((homeFeed) => this.homeFeed = homeFeed),
        ];
        // Delay the trending tag etc. toot pulls a bit because they generate a ton of API calls
        await new Promise(r => setTimeout(r, config_1.Config.hashtagTootRetrievalDelaySeconds * 1000));
        const secondaryLoads = [
            this.fetchAndMergeToots(hashtags_1.getParticipatedHashtagToots),
            this.fetchAndMergeToots(hashtags_1.getRecentTootsForTrendingTags),
            this.fetchAndMergeToots(mastodon_server_1.default.fediverseTrendingToots.bind(mastodon_server_1.default)),
            // Population of instance variables - these are not required to be done before the feed is loaded
            mastodon_server_1.default.getMastodonInstancesInfo().then((servers) => this.mastodonServers = servers),
            mastodon_server_1.default.getTrendingData().then((trendingData) => this.trendingData = trendingData),
            api_1.default.instance.getUserData().then((userData) => this.userData = userData),
        ];
        await Promise.all([...initialLoads, ...secondaryLoads]);
        this.finishFeedUpdate();
    }
    // Return the current filtered timeline feed in weight order
    getTimeline() {
        return this.filterFeedAndSetInApp();
    }
    // Return the user's current weightings for each score category
    async getUserWeights() {
        return await Storage_1.default.getWeights();
    }
    // TODO: Using loadingStatus as the main determinant of state is kind of janky
    isLoading() {
        return !!(this.loadingStatus && this.loadingStatus != READY_TO_LOAD_MSG);
    }
    // Apparently if the mutex lock is inside mergeTootsToFeed() then the state of this.feed is not consistent
    // which can result in toots getting lost as threads try to merge newToots into different this.feed states.
    // Wrapping the entire function in a mutex seems to fix this (though i'm not sure why).
    async lockedMergeTootsToFeed(newToots, logPrefix) {
        newToots = (0, collection_helpers_1.filterWithLog)(newToots, t => t.isValidForFeed(), logPrefix, 'invalid', 'Toot');
        const releaseMutex = await (0, log_helpers_1.lockExecution)(this.mergeMutex, logPrefix);
        try {
            await this._mergeTootsToFeed(newToots, logPrefix);
        }
        finally {
            releaseMutex();
        }
    }
    ;
    // Return the timestamp of the most recent toot from followed accounts ONLY
    mostRecentHomeTootAt() {
        return (0, toot_1.mostRecentTootedAt)(this.homeFeed);
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
        return await this.updateUserWeights(weight_presets_1.PresetWeights[presetName]);
    }
    // Clear everything from browser storage except the user's identity and weightings
    async reset() {
        console.warn(`reset() called, clearing all storage...`);
        this.dataPoller && clearInterval(this.dataPoller);
        this.hasProvidedAnyTootsToClient = false;
        this.loadingStatus = READY_TO_LOAD_MSG;
        this.loadStartedAt = null;
        this.mastodonServers = {};
        this.feed = [];
        await Storage_1.default.clearAll();
        await this.loadCachedData();
        api_1.default.instance.setSemaphoreConcurrency(config_1.Config.maxConcurrentRequestsInitial);
    }
    // Merge a new batch of toots into the feed.
    // Mutates this.feed and returns whatever newToots are retrieve by tooFetcher()
    async fetchAndMergeToots(tootFetcher) {
        const logPrefix = tootFetcher.name;
        const startedAt = new Date();
        let newToots = [];
        try {
            newToots = await tootFetcher();
            (0, log_helpers_1.logInfo)(logPrefix, `${string_helpers_1.TELEMETRY} fetched ${newToots.length} toots ${(0, time_helpers_1.ageString)(startedAt)}`);
        }
        catch (e) {
            api_1.default.throwIfAccessTokenRevoked(e, `${logPrefix} Error fetching toots ${(0, time_helpers_1.ageString)(startedAt)}`);
        }
        await this.lockedMergeTootsToFeed(newToots, logPrefix);
    }
    // Filter the feed based on the user's settings. Has the side effect of calling the setTimelineInApp() callback
    // that will send the client using this library the filtered subset of Toots (this.feed will always maintain
    // the master timeline).
    filterFeedAndSetInApp() {
        const filteredFeed = this.feed.filter(toot => toot.isInTimeline(this.filters));
        this.setTimelineInApp(filteredFeed);
        if (!this.hasProvidedAnyTootsToClient && this.feed.length > 0) {
            this.hasProvidedAnyTootsToClient = true;
            (0, log_helpers_1.logInfo)(string_helpers_1.TELEMETRY, `First ${filteredFeed.length} toots sent to client ${(0, time_helpers_1.ageString)(this.loadStartedAt)}`);
        }
        return filteredFeed;
    }
    // Kick off the MOAR data poller to collect more user history data if it doesn't already exist
    launchBackgroundPoller() {
        if (this.dataPoller) {
            console.log(`${poller_1.MOAR_DATA_PREFIX} data poller already exists, not starting another one`);
            return;
        }
        this.dataPoller = setInterval(async () => {
            const shouldContinue = await (0, poller_1.getMoarData)();
            // Force scorers to recompute data, rescore the feed
            await this.userData.populate();
            await this.prepareScorers(true);
            await this.scoreAndFilterFeed();
            if (!shouldContinue) {
                console.log(`${poller_1.MOAR_DATA_PREFIX} stopping data poller...`);
                this.dataPoller && clearInterval(this.dataPoller);
            }
        }, config_1.Config.backgroundLoadIntervalSeconds * 1000);
    }
    // Load cached data from storage. This is called when the app is first opened and when reset() is called.
    async loadCachedData() {
        this.feed = await Storage_1.default.getCoerced(types_1.StorageKey.TIMELINE);
        this.filters = await Storage_1.default.getFilters() ?? (0, feed_filters_1.buildNewFilterSettings)();
        this.trendingData = await Storage_1.default.getTrending();
        this.userData = await Storage_1.default.loadUserData();
        this.setTimelineInApp(this.feed);
        console.log(`[fedialgo] loaded ${this.feed.length} timeline toots from cache, trendingData`);
    }
    // Log a message with the current state of the state variables
    // TODO: should be private, public for debugging for now
    logWithState(prefix, msg) {
        console.log(`${prefix} ${msg}. state:`, this.statusDict());
        Storage_1.default.dumpData();
    }
    // Merge newToots into this.feed, score, and filter the feed.
    // Don't call this directly, use lockedMergeTootsToFeed() instead.
    async _mergeTootsToFeed(newToots, logPrefix) {
        const numTootsBefore = this.feed.length; // Good log filter for seeing the issue
        const startedAt = new Date();
        this.feed = toot_1.default.dedupeToots([...this.feed, ...newToots], logPrefix);
        (0, feed_filters_1.updatePropertyFilterOptions)(this.filters, this.feed, await api_1.default.instance.getUserData());
        await this.scoreAndFilterFeed();
        let msg = `${string_helpers_1.TELEMETRY} merge ${newToots.length} complete ${(0, time_helpers_1.ageString)(startedAt)}, `;
        (0, log_helpers_1.logInfo)(logPrefix, `${msg} numTootsBefore: ${numTootsBefore}, state:`, this.statusDict());
        this.setLoadingStateVariables(logPrefix);
    }
    // Prepare the scorers for scoring. If 'force' is true, force them to recompute data even if they are already ready.
    async prepareScorers(force) {
        const releaseMutex = await (0, log_helpers_1.lockExecution)(this.scoreMutex, log_helpers_1.PREP_SCORERS);
        try {
            if (force || this.featureScorers.some(scorer => !scorer.isReady)) {
                const startedAt = new Date();
                await Promise.all(this.featureScorers.map(scorer => scorer.fetchRequiredData()));
                (0, log_helpers_1.logInfo)(string_helpers_1.TELEMETRY, `${log_helpers_1.PREP_SCORERS} ready in ${(0, time_helpers_1.ageString)(startedAt)}`);
            }
        }
        finally {
            releaseMutex();
        }
    }
    // Score the feed, sort it, save it to storage, and call filterFeed() to update the feed in the app
    // Returns the FILTERED set of toots (NOT the entire feed!)
    async scoreAndFilterFeed() {
        await this.prepareScorers(); // Make sure the scorers are ready to go
        this.feed = await scorer_1.default.scoreToots(this.feed, this.featureScorers, this.feedScorers);
        this.feed = (0, collection_helpers_1.truncateToConfiguredLength)(this.feed, "maxCachedTimelineToots");
        await Storage_1.default.set(types_1.StorageKey.TIMELINE, this.feed);
        return this.filterFeedAndSetInApp();
    }
    // The "load is finished" version of setLoadingStateVariables(). // TODO: there's too many state variables
    finishFeedUpdate() {
        this.loadingStatus = null;
        if (this.loadStartedAt) {
            (0, log_helpers_1.logInfo)(string_helpers_1.TELEMETRY, `Finished home TL load w/ ${this.feed.length} toots ${(0, time_helpers_1.ageString)(this.loadStartedAt)}`);
            this.lastLoadTimeInSeconds = (0, time_helpers_1.ageInSeconds)(this.loadStartedAt);
        }
        else {
            console.warn(`[${string_helpers_1.TELEMETRY}] FINISHED LOAD... but loadStartedAt is null!`);
            this.lastLoadTimeInSeconds = null;
        }
        this.loadStartedAt = null;
        this.launchBackgroundPoller();
        api_1.default.instance.setSemaphoreConcurrency(config_1.Config.maxConcurrentRequestsBackground);
    }
    // sets this.loadingStatus to a message indicating the current state of the feed
    setLoadingStateVariables(logPrefix) {
        if (logPrefix == log_helpers_1.TRIGGER_FEED)
            this.loadStartedAt = new Date();
        // If feed is empty then it's an initial load, otherwise it's a catchup if TRIGGER_FEED
        if (!this.feed.length) {
            this.loadingStatus = INITIAL_LOAD_STATUS;
        }
        else if (logPrefix == log_helpers_1.TRIGGER_FEED) {
            this.loadingStatus = `new toots since ${(0, time_helpers_1.timeString)(this.mostRecentHomeTootAt())}`;
        }
        else {
            this.loadingStatus = `more toots (retrieved ${this.feed.length.toLocaleString()} toots so far)`;
        }
        (0, log_helpers_1.logDebug)(logPrefix, `setLoadingStateVariables()`, this.statusDict());
    }
    // Info about the state of this TheAlgorithm instance
    statusDict() {
        return {
            tootsInFeed: this.feed?.length,
            loadingStatus: this.loadingStatus,
            mostRecentHomeTootAt: (0, time_helpers_1.toISOFormat)(this.mostRecentHomeTootAt()),
        };
    }
}
exports.TheAlgorithm = TheAlgorithm;
;
//# sourceMappingURL=index.js.map