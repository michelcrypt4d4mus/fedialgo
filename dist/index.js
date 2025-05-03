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
exports.timeString = exports.keyByProperty = exports.extractDomain = exports.WeightName = exports.TypeFilterName = exports.Toot = exports.TheAlgorithm = exports.PropertyName = exports.PropertyFilter = exports.PresetWeights = exports.PresetWeightLabel = exports.NumericFilter = exports.MediaCategory = exports.Account = exports.VIDEO_TYPES = exports.GIFV = void 0;
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
const feed_filters_1 = require("./filters/feed_filters");
const log_helpers_1 = require("./helpers/log_helpers");
const weight_presets_1 = require("./scorer/weight_presets");
const collection_helpers_1 = require("./helpers/collection_helpers");
Object.defineProperty(exports, "keyByProperty", { enumerable: true, get: function () { return collection_helpers_1.keyByProperty; } });
const poller_1 = require("./api/poller");
const hashtags_1 = require("./feeds/hashtags");
const string_helpers_1 = require("./helpers/string_helpers");
Object.defineProperty(exports, "GIFV", { enumerable: true, get: function () { return string_helpers_1.GIFV; } });
Object.defineProperty(exports, "VIDEO_TYPES", { enumerable: true, get: function () { return string_helpers_1.VIDEO_TYPES; } });
Object.defineProperty(exports, "extractDomain", { enumerable: true, get: function () { return string_helpers_1.extractDomain; } });
const weight_presets_2 = require("./scorer/weight_presets");
Object.defineProperty(exports, "PresetWeightLabel", { enumerable: true, get: function () { return weight_presets_2.PresetWeightLabel; } });
Object.defineProperty(exports, "PresetWeights", { enumerable: true, get: function () { return weight_presets_2.PresetWeights; } });
const config_1 = require("./config");
const time_helpers_1 = require("./helpers/time_helpers");
Object.defineProperty(exports, "timeString", { enumerable: true, get: function () { return time_helpers_1.timeString; } });
const types_1 = require("./types");
Object.defineProperty(exports, "MediaCategory", { enumerable: true, get: function () { return types_1.MediaCategory; } });
Object.defineProperty(exports, "WeightName", { enumerable: true, get: function () { return types_1.WeightName; } });
const GET_FEED_BUSY_MSG = `called while load is still in progress. Consider using the setFeedInApp() callback.`;
const INITIAL_STATUS_MSG = "(ready to load)";
const CLEANUP_FEED = "cleanupFeed()";
const GET_FEED = "getFeed()";
const MAX_ID_IDX = 2;
;
class TheAlgorithm {
    feed = [];
    filters = (0, feed_filters_1.buildNewFilterSettings)();
    lastLoadTimeInSeconds = null; // Duration of the last load in seconds
    // TODO: loadingStatus has become the main flag for whether the feed is loading or not. Not great.
    loadingStatus = INITIAL_STATUS_MSG; // String describing load activity (undefined means load complete)
    mastodonServers = {};
    trendingData = { links: [], tags: [], toots: [] };
    userData = new user_data_1.default();
    // Constructor argument variables
    api;
    user;
    setFeedInApp; // Optional callback to set the feed in the app using this package
    // Other private variables
    catchupCheckpoint = null; // If doing a catch up refresh load we need to get back to this timestamp
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
    }, 
    // TimeDecay and Trending require bespoke handling so they aren't included in the loop above
    {
        [types_1.WeightName.TIME_DECAY]: Object.assign({}, config_1.SCORERS_CONFIG[types_1.WeightName.TIME_DECAY]),
        [types_1.WeightName.TRENDING]: Object.assign({}, config_1.SCORERS_CONFIG[types_1.WeightName.TRENDING]),
    });
    // Publicly callable constructor() that instantiates the class and loads the feed from storage.
    static async create(params) {
        const user = new account_1.default(params.user);
        await Storage_1.default.setIdentity(user);
        await Storage_1.default.logAppOpen();
        // Construct the algorithm object, set the default weights, load feed and filters
        const algo = new TheAlgorithm({ api: params.api, user: user, setFeedInApp: params.setFeedInApp });
        await algo.setDefaultWeights();
        await algo.loadCachedData();
        return algo;
    }
    constructor(params) {
        this.api = params.api;
        this.user = params.user;
        this.setFeedInApp = params.setFeedInApp ?? ((f) => console.debug(`Default setFeedInApp() called`));
        api_1.default.init(this.api, this.user);
    }
    // Fetch toots from followed accounts plus trending toots in the fediverse, then score and sort them
    // TODO: this will stop pulling toots before it fills in the gap back to the last of the user's actual timeline toots.
    async getFeed(numTimelineToots, maxId) {
        (0, log_helpers_1.logInfo)(GET_FEED, `(numTimelineToots=${numTimelineToots}, maxId=${maxId}), state:`, this.statusDict());
        if (!maxId && !numTimelineToots && this.loadingStatus && this.loadingStatus != INITIAL_STATUS_MSG) {
            (0, log_helpers_1.logAndThrowError)(`${GET_FEED} ${GET_FEED_BUSY_MSG}`);
        }
        numTimelineToots ??= Storage_1.default.getConfig().numTootsInFirstFetch;
        // If this is the first call to getFeed() also fetch the UserData (followed accts, blocks, etc.)
        if (!maxId) {
            // If getFeed() is called with no maxId and no toots in the feed then it's an initial load.
            if (!this.feed.length) {
                this.loadingStatus = "initial data";
                // Otherwise if there's no maxId but there is already an existing feed array that means it's a refresh
            }
            else {
                this.catchupCheckpoint = this.mostRecentHomeTootAt();
                this.loadingStatus = `new toots since ${(0, time_helpers_1.timeString)(this.catchupCheckpoint)}`;
                console.info(`${GET_FEED} Set catchupCheckpoint marker. Current state:`, this.statusDict());
            }
            // These are all calls we should only make in the initial load (all called asynchronously)
            this.loadStartedAt = new Date();
            this.prepareScorers();
            // TODO: consider waiting until after 100 or so toots have been loaded to launch these pulls
            this.mergePromisedTootsIntoFeed(mastodon_server_1.default.fediverseTrendingToots(), "fediverseTrendingToots");
            this.mergePromisedTootsIntoFeed((0, hashtags_1.getRecentTootsForTrendingTags)(), "getRecentTootsForTrendingTags");
            this.mergePromisedTootsIntoFeed((0, hashtags_1.getParticipatedHashtagToots)(), "participatedHashtagToots");
            mastodon_server_1.default.getMastodonInstancesInfo().then((servers) => this.mastodonServers = servers);
            mastodon_server_1.default.getTrendingData().then((trendingData) => this.trendingData = trendingData);
            api_1.default.instance.getUserData().then((userData) => this.userData = userData);
        }
        else {
            this.loadingStatus = this.loadingMoreTootsStatusMsg();
            ;
        }
        this.mergePromisedTootsIntoFeed(api_1.default.instance.fetchHomeFeed(numTimelineToots, maxId), "fetchHomeFeed")
            .then((newToots) => {
            let msg = `fetchHomeFeed got ${newToots.length} new home timeline toots, ${this.homeTimelineToots().length}`;
            msg += ` total home TL toots so far ${(0, time_helpers_1.inSeconds)(this.loadStartedAt)}. Calling maybeGetMoreToots()...`;
            (0, log_helpers_1.logInfo)(GET_FEED, msg);
            this.maybeGetMoreToots(newToots, numTimelineToots || Storage_1.default.getConfig().numTootsInFirstFetch);
        });
        // TODO: Return is here for devs using Fedialgo but it's not well thought out (demo app uses setFeedInApp())
        return this.scoreAndFilterFeed();
    }
    // Return the user's current weightings for each score category
    async getUserWeights() {
        return await Storage_1.default.getWeightings();
    }
    // Update the feed filters and return the newly filtered feed
    updateFilters(newFilters) {
        console.log(`updateFilters() called with newFilters:`, newFilters);
        this.filters = newFilters;
        Storage_1.default.setFilters(newFilters);
        return this.setFilteredFeedInApp();
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
        return await this.updateUserWeights(weight_presets_2.PresetWeights[presetName]);
    }
    // Clear everything from browser storage except the user's identity and weightings
    async reset() {
        console.warn(`reset() called, clearing all storage...`);
        this.dataPoller && clearInterval(this.dataPoller);
        this.hasProvidedAnyTootsToClient = false;
        this.loadingStatus = INITIAL_STATUS_MSG;
        this.loadStartedAt = null;
        this.mastodonServers = {};
        this.catchupCheckpoint = null;
        await Storage_1.default.clearAll();
        await this.loadCachedData();
    }
    // Return the timestamp of the most recent toot from followed accounts ONLY
    mostRecentHomeTootAt() {
        return (0, toot_1.mostRecentTootedAt)(this.homeTimelineToots());
    }
    homeTimelineToots() {
        return this.feed.filter(toot => toot.isFollowed);
    }
    // Filter the feed based on the user's settings. Has the side effect of calling the setFeedInApp() callback
    // that will send the client using this library the filtered subset of Toots (this.feed will always maintain
    // the master timeline).
    setFilteredFeedInApp() {
        const filteredFeed = this.feed.filter(toot => toot.isInTimeline(this.filters));
        this.setFeedInApp(filteredFeed);
        if (!this.hasProvidedAnyTootsToClient) {
            this.hasProvidedAnyTootsToClient = true;
            (0, log_helpers_1.logInfo)(string_helpers_1.TELEMETRY, `First ${filteredFeed.length} toots sent to client ${(0, time_helpers_1.inSeconds)(this.loadStartedAt)}`);
        }
        return filteredFeed;
    }
    // Load cached data from storage. This is called when the app is first opened and when reset() is called.
    async loadCachedData() {
        this.feed = (await Storage_1.default.getFeed()) ?? [];
        this.filters = await Storage_1.default.getFilters();
        this.trendingData = await Storage_1.default.getTrending();
        this.setFeedInApp(this.feed);
        console.log(`[fedialgo] loaded ${this.feed.length} timeline toots from cache, trendingData`);
    }
    // Handles deciding what is the current state of the world and whether to continue fetching timeline toots
    async maybeGetMoreToots(newHomeToots, numTimelineToots) {
        const config = Storage_1.default.getConfig();
        const maxInitialTimelineToots = config.maxInitialTimelineToots;
        const earliestNewHomeTootAt = (0, toot_1.earliestTootedAt)(newHomeToots);
        let logPrefix = `[maybeGetMoreToots()]`;
        if (
        // If we don't have enough toots yet and we got almost all the numTimelineToots we requested last time
        // ("almost" bc sometimes we get 38 records instead of 40) then there's probably more toots to fetch.
        (this.feed.length < maxInitialTimelineToots && newHomeToots.length >= (numTimelineToots - MAX_ID_IDX))
            // Or if we have enough toots but the catchupCheckpoint is older than what we just got also fetch more
            || (this.catchupCheckpoint && earliestNewHomeTootAt && earliestNewHomeTootAt > this.catchupCheckpoint)) {
            // Extract the minimum ID from the last batch of toots (or almost - we use the 3rd toot bc sometimes
            // there are weird outliers in the 1st toot). We must ONLY look at home timeline toots for this -
            // toots from other servers will have different ID schemes.
            // TODO: this is kind of shaky logic - what if a user follows almost no one and has an empty feed?
            const maxId = (0, toot_1.sortByCreatedAt)(newHomeToots)[MAX_ID_IDX].id;
            this.logWithState(logPrefix, `Scheduling ${GET_FEED} recursively with maxID='${maxId}'`);
            setTimeout(() => this.getFeed(numTimelineToots, maxId), config.incrementalLoadDelayMS);
            return;
        }
        // Otherwise stop (either we have enough toots, the last fetch didn't get fulfilled, or we hit the checkpoint)
        logPrefix += ` Halting ${GET_FEED}:`;
        if (this.catchupCheckpoint) { // If we hit the checkpoint
            if (earliestNewHomeTootAt && earliestNewHomeTootAt < this.catchupCheckpoint) {
                let msg = `all caught up: oldest newHomeToot is ${(0, time_helpers_1.quotedISOFmt)(earliestNewHomeTootAt)}`;
                this.logWithState(logPrefix, `${msg}, older than checkpoint ${(0, time_helpers_1.quotedISOFmt)(this.catchupCheckpoint)}`);
                this.catchupCheckpoint = null;
            }
            else {
                console.warn(`${logPrefix} but NOT caught up to catchupCheckpoint! state:`, this.statusDict());
            }
        }
        else if (this.feed.length >= maxInitialTimelineToots) { // Or if we have enough toots
            this.logWithState(logPrefix, `have enough toots (have ${this.feed.length}, want ${maxInitialTimelineToots})`);
        }
        else { // Otherwise (presumably) the last fetch didn't get fulfilled
            this.logWithState(logPrefix, `last fetch only got ${newHomeToots.length} toots, expected ${numTimelineToots}`);
        }
        // Now that we have a complete set of initial toots start the background data poller
        this.launchBackgroundPoller();
        this.markLoadComplete();
        this.loadingStatus = null;
    }
    launchBackgroundPoller() {
        if (this.dataPoller) {
            console.log(`${poller_1.MOAR_DATA_PREFIX} data poller already exists, not starting another one`);
            return;
        }
        console.log(`${poller_1.MOAR_DATA_PREFIX} starting data poller...`);
        this.dataPoller = setInterval(async () => {
            // Force scorers to recompute data, rescore the feed
            const shouldContinue = await (0, poller_1.getMoarData)();
            await this.userData.populate();
            await this.prepareScorers(true);
            await this.scoreAndFilterFeed();
            if (!shouldContinue) {
                console.log(`${poller_1.MOAR_DATA_PREFIX} stopping data poller...`);
                this.dataPoller && clearInterval(this.dataPoller);
            }
        }, Storage_1.default.getConfig().backgroundLoadIntervalMS);
    }
    loadingMoreTootsStatusMsg() {
        let msg = `more toots (retrieved ${this.feed.length.toLocaleString()} toots so far`;
        if (this.feed.length < Storage_1.default.getConfig().maxInitialTimelineToots) {
            msg += `, want ${Storage_1.default.getConfig().maxInitialTimelineToots.toLocaleString()}`;
        }
        return msg + ')';
    }
    logWithState(prefix, msg) {
        console.log(`${prefix} ${msg}. state:`, this.statusDict());
    }
    // Set a few state variables indicating that the load is complete. // TODO: there's too many state variables
    markLoadComplete() {
        if (this.loadStartedAt) {
            (0, log_helpers_1.logInfo)(string_helpers_1.TELEMETRY, `Finished home TL load w/ ${this.feed.length} toots ${(0, time_helpers_1.inSeconds)(this.loadStartedAt)}`);
            this.lastLoadTimeInSeconds = (0, time_helpers_1.ageInSeconds)(this.loadStartedAt);
            this.loadStartedAt = null;
        }
        else {
            this.lastLoadTimeInSeconds = null;
            console.warn(`[${string_helpers_1.TELEMETRY}] FINISHED LOAD... but loadStartedAt is null!`);
        }
    }
    // Merge a new batch of toots into the feed. Returns whatever toots are retrieve by tooFetcher
    async mergePromisedTootsIntoFeed(tootFetcher, label) {
        const logPrefix = `mergeTootsIntoFeed() ${label}`;
        const startedAt = new Date();
        let newToots = [];
        try {
            newToots = await tootFetcher;
        }
        catch (e) {
            console.error(`${logPrefix} Error fetching toots:`, e);
        }
        // Only need to lock the mutex when we start modifying common variables like this.feed
        const releaseMutex = await (0, log_helpers_1.lockMutex)(this.mergeMutex, logPrefix);
        try {
            this.feed = await this.mergeTootsWithFeed(newToots);
            await this.scoreAndFilterFeed();
            (0, log_helpers_1.logInfo)(string_helpers_1.TELEMETRY, `${label} merged ${newToots.length} toots ${(0, time_helpers_1.inSeconds)(startedAt)}:`, this.statusDict());
            return newToots;
        }
        finally {
            releaseMutex();
        }
    }
    // Remove invalid and duplicate toots, merge them with the feed, and update the filters
    // Does NOT mutate this.feed in place (though it does modify this.filters).
    async mergeTootsWithFeed(toots) {
        toots = (0, collection_helpers_1.filterWithLog)(toots, t => t.isValidForFeed(), CLEANUP_FEED, 'invalid', 'Toot');
        toots = toot_1.default.dedupeToots([...this.feed, ...toots], CLEANUP_FEED);
        this.filters = (0, feed_filters_1.initializeFiltersWithSummaryInfo)(toots, await api_1.default.instance.getUserData());
        return toots;
    }
    // Prepare the scorers for scoring. If 'force' is true, force them to recompute data even if they are already ready.
    async prepareScorers(force) {
        const logPrefix = `prepareScorers()`;
        const releaseMutex = await (0, log_helpers_1.lockMutex)(this.scoreMutex, logPrefix);
        try {
            if (force || this.featureScorers.some(scorer => !scorer.isReady)) {
                const startTime = new Date();
                await Promise.all(this.featureScorers.map(scorer => scorer.fetchRequiredData()));
                (0, log_helpers_1.logInfo)(string_helpers_1.TELEMETRY, `${logPrefix} ready in ${(0, time_helpers_1.inSeconds)(startTime)}`);
            }
        }
        finally {
            releaseMutex();
        }
    }
    // Load weightings from storage. Set defaults for any missing weightings.
    async setDefaultWeights() {
        let weightings = await Storage_1.default.getWeightings();
        let shouldSetWeights = false;
        Object.keys(this.scorersDict).forEach((key) => {
            const value = weightings[key];
            if (!value && value !== 0) {
                weightings[key] = weight_presets_1.DEFAULT_WEIGHTS[key];
                shouldSetWeights = true;
            }
        });
        // If any changes were made to the Storage weightings, save them back to storage
        if (shouldSetWeights)
            await Storage_1.default.setWeightings(weightings);
    }
    // Score the feed, sort it, save it to storage, and call filterFeed() to update the feed in the app
    // Returns the FILTERED set of toots (NOT the entire feed!)
    async scoreAndFilterFeed() {
        await this.prepareScorers();
        this.feed = await scorer_1.default.scoreToots(this.feed, this.featureScorers, this.feedScorers);
        this.feed = (0, collection_helpers_1.truncateToConfiguredLength)(this.feed, "maxCachedTimelineToots");
        await Storage_1.default.setFeed(this.feed);
        return this.setFilteredFeedInApp();
    }
    // Info about the state of this TheAlgorithm instance
    statusDict() {
        return {
            tootsInFeed: this.feed?.length,
            loadingStatus: this.loadingStatus,
            catchupCheckpoint: this.catchupCheckpoint ? (0, time_helpers_1.toISOFormat)(this.catchupCheckpoint) : null,
            mostRecentHomeTootAt: (0, time_helpers_1.toISOFormat)(this.mostRecentHomeTootAt()),
        };
    }
}
exports.TheAlgorithm = TheAlgorithm;
;
//# sourceMappingURL=index.js.map