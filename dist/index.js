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
exports.timeString = exports.extractDomain = exports.WeightName = exports.TypeFilterName = exports.Toot = exports.TheAlgorithm = exports.PropertyName = exports.PropertyFilter = exports.PresetWeights = exports.PresetWeightLabel = exports.NumericFilter = exports.MediaCategory = exports.Account = exports.VIDEO_TYPES = exports.GIFV = void 0;
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
const log_helpers_1 = require("./helpers/log_helpers");
const weight_presets_1 = require("./scorer/weight_presets");
const collection_helpers_1 = require("./helpers/collection_helpers");
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
const types_1 = require("./types");
Object.defineProperty(exports, "MediaCategory", { enumerable: true, get: function () { return types_1.MediaCategory; } });
Object.defineProperty(exports, "WeightName", { enumerable: true, get: function () { return types_1.WeightName; } });
const DEFAULT_SET_TIMELINE_IN_APP = (feed) => console.debug(`Default setTimelineInApp() called`);
const GET_FEED_BUSY_MSG = `called while load is still in progress. Consider using the setTimelineInApp() callback.`;
// TODO: The demo app prefixes these with "Loading (msg)..." which is not ideal
const READY_TO_LOAD_MSG = "(ready to load)";
const INITIAL_LOAD_STATUS = "initial data";
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
        const algo = new TheAlgorithm({ api: params.api, user: user, setTimelineInApp: params.setTimelineInApp });
        await algo.setDefaultWeights();
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
        this.setLoadingStateVariables(true);
        // Trigger toot fetchers
        this.fetchHomeTimeline();
        this.fetchAndMergeToots(hashtags_1.getParticipatedHashtagToots);
        this.fetchAndMergeToots(mastodon_server_1.default.fediverseTrendingToots.bind(mastodon_server_1.default));
        // Trigger other data retrievals to populate TheAlgorithm's various instance variables
        mastodon_server_1.default.getMastodonInstancesInfo().then((servers) => this.mastodonServers = servers);
        mastodon_server_1.default.getTrendingData().then((trendingData) => this.trendingData = trendingData);
        api_1.default.instance.getUserData().then((userData) => this.userData = userData);
        this.prepareScorers();
        // Delay the trending tag toot pulls a bit because they generate a ton of API calls
        let hashtagTootDelayMS = Storage_1.default.getConfig().hashtagTootRetrievalDelaySeconds * 1000;
        hashtagTootDelayMS *= (this.feed.length ? 0.5 : 1); // If we already have toots, reduce the delay
        setTimeout(() => this.fetchAndMergeToots(hashtags_1.getRecentTootsForTrendingTags), hashtagTootDelayMS);
    }
    // Return the current filtered timeline feed in weight order
    getTimeline() {
        return this.filterFeedAndSetInApp();
    }
    // Return the user's current weightings for each score category
    async getUserWeights() {
        return await Storage_1.default.getWeightings();
    }
    // TODO: Using loadingStatus as the main determinant of state is kind of janky
    isLoading() {
        return !!(this.loadingStatus && this.loadingStatus != READY_TO_LOAD_MSG);
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
        return await this.updateUserWeights(weight_presets_2.PresetWeights[presetName]);
    }
    // Clear everything from browser storage except the user's identity and weightings
    async reset() {
        console.warn(`reset() called, clearing all storage...`);
        this.dataPoller && clearInterval(this.dataPoller);
        this.hasProvidedAnyTootsToClient = false;
        this.loadingStatus = READY_TO_LOAD_MSG;
        this.loadStartedAt = null;
        this.mastodonServers = {};
        this.catchupCheckpoint = null;
        await Storage_1.default.clearAll();
        await this.loadCachedData();
    }
    // Fetch toots from the mastodon "home timeline" API backwards from 'maxId'.
    // Works in conjunction with maybeGetMoreTimelineToots() to build a complete timeline.
    async fetchHomeTimeline(maxId) {
        const batchSize = Storage_1.default.getConfig().homeTimelineBatchSize;
        const fetchHomeTimeline = async () => await api_1.default.instance.fetchHomeFeed(batchSize, maxId);
        this.fetchAndMergeToots(fetchHomeTimeline).then((newToots) => {
            let msg = `fetchHomeFeed got ${newToots.length} new home timeline toots, ${this.homeTimelineToots().length}`;
            msg += ` total home TL toots so far ${(0, time_helpers_1.ageString)(this.loadStartedAt)}. Calling maybeGetMoreToots()...`;
            (0, log_helpers_1.logInfo)(log_helpers_1.TRIGGER_FEED, msg);
            // maybeGetMoreToots() will recursively call fetchHomeTimeline() until we have enough toots
            this.maybeGetMoreTimelineToots(newToots);
        });
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
    // Filter the feed to only include toots from followed accounts
    homeTimelineToots() {
        return this.feed.filter(toot => toot.isFollowed);
    }
    // Kick off the MOAR data poller to collect more user history data if it doesn't already exist
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
    // Load cached data from storage. This is called when the app is first opened and when reset() is called.
    async loadCachedData() {
        this.feed = await Storage_1.default.getCoerced(types_1.StorageKey.TIMELINE);
        this.filters = await Storage_1.default.getFilters() ?? (0, feed_filters_1.buildNewFilterSettings)();
        this.trendingData = await Storage_1.default.getTrending();
        this.userData = await Storage_1.default.getUserData();
        this.setTimelineInApp(this.feed);
        console.log(`[fedialgo] loaded ${this.feed.length} timeline toots from cache, trendingData`);
    }
    // Log a message with the current state of the state variables
    logWithState(prefix, msg) {
        console.log(`${prefix} ${msg}. state:`, this.statusDict());
    }
    // Return the timestamp of the most recent toot from followed accounts ONLY
    mostRecentHomeTootAt() {
        return (0, toot_1.mostRecentTootedAt)(this.homeTimelineToots());
    }
    // Decide whether we should fetch more home timeline toots based on current state + the new toots we just got
    shouldGetMoreHomeToots(newHomeToots) {
        const maxInitialTimelineToots = Storage_1.default.getConfig().numDesiredTimelineToots;
        const earliestNewHomeTootAt = (0, toot_1.earliestTootedAt)(newHomeToots);
        const acceptableBatchSize = Storage_1.default.getConfig().homeTimelineBatchSize - 3; // TODO: this is a bit arbitrary
        // If we don't have enough toots yet and we got almost all the numTimelineToots we requested last time
        // ("almost" bc sometimes we get 38 records instead of 40) then there's probably more toots to fetch.
        if ((this.feed.length < maxInitialTimelineToots && newHomeToots.length >= acceptableBatchSize)) {
            return true;
        }
        // Or if we have enough toots but the catchupCheckpoint is older than what we just got also fetch more
        if (this.catchupCheckpoint && earliestNewHomeTootAt && earliestNewHomeTootAt > this.catchupCheckpoint) {
            return true;
        }
        return false;
    }
    // Decide what is the current state of the world and whether to continue fetching home timeline toots
    async maybeGetMoreTimelineToots(newHomeToots) {
        const maxInitialTimelineToots = Storage_1.default.getConfig().numDesiredTimelineToots;
        const earliestNewHomeTootAt = (0, toot_1.earliestTootedAt)(newHomeToots);
        let logPrefix = `[maybeGetMoreToots()]`;
        // If we want to get another batch of timeline toots schedule it and exit this method
        if (this.shouldGetMoreHomeToots(newHomeToots)) {
            const maxId = toot_1.default.findMinIdForMaxIdParam(newHomeToots);
            this.logWithState(logPrefix, `Scheduling ${log_helpers_1.TRIGGER_FEED} recursively with maxID='${maxId}'`);
            this.setLoadingStateVariables(false);
            setTimeout(() => this.fetchHomeTimeline(maxId), Storage_1.default.getConfig().incrementalLoadDelayMS);
            return;
        }
        // Otherwise stop (either we have enough toots, the last fetch didn't get fulfilled, or we hit the checkpoint)
        logPrefix += ` Halting ${log_helpers_1.TRIGGER_FEED}:`;
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
            this.logWithState(logPrefix, `done (have ${this.feed.length} toots, wanted ${maxInitialTimelineToots})`);
        }
        else { // Otherwise (presumably) the last fetch didn't get fulfilled
            const batchSize = Storage_1.default.getConfig().homeTimelineBatchSize;
            this.logWithState(logPrefix, `last fetch only got ${newHomeToots.length} toots, expected ${batchSize}`);
        }
        // Now that we have a complete set of initial toots start the background data poller and lower concurrency
        this.launchBackgroundPoller();
        this.setLoadCompleteStateVariables();
        api_1.default.instance.setBackgroundConcurrency();
        this.loadingStatus = null;
    }
    // Merge a new batch of toots into the feed.
    // Mutates this.feed and returns whatever newToots are retrieve by tooFetcher()
    async fetchAndMergeToots(tootFetcher) {
        const logPrefix = `fetchAndMergeToots() ${tootFetcher.name}`;
        const startedAt = new Date();
        let newToots = [];
        const logTootsStr = () => `${newToots.length} toots ${(0, time_helpers_1.ageString)(startedAt)}`;
        (0, log_helpers_1.traceLog)(`${logPrefix} started fetching toots...`);
        try {
            newToots = await tootFetcher();
            (0, log_helpers_1.logInfo)(logPrefix, `${string_helpers_1.TELEMETRY} fetched ${logTootsStr()}`);
        }
        catch (e) {
            api_1.default.throwIfAccessTokenRevoked(e, `${logPrefix} Error fetching toots ${(0, time_helpers_1.ageString)(startedAt)}`);
        }
        // Only need to lock the mutex when we start modifying common variables like this.feed
        const releaseMutex = await (0, log_helpers_1.lockMutex)(this.mergeMutex, logPrefix);
        try {
            newToots = (0, collection_helpers_1.filterWithLog)(newToots, t => t.isValidForFeed(), log_helpers_1.CLEANUP_FEED, 'invalid', 'Toot');
            this.feed = toot_1.default.dedupeToots([...this.feed, ...newToots], log_helpers_1.CLEANUP_FEED);
            this.filters = (0, feed_filters_1.initializeFiltersWithSummaryInfo)(this.feed, await api_1.default.instance.getUserData());
            await this.scoreAndFilterFeed();
            (0, log_helpers_1.logInfo)(logPrefix, `${string_helpers_1.TELEMETRY} fetch + merge complete ${logTootsStr()}, state:`, this.statusDict());
            return newToots;
        }
        finally {
            releaseMutex();
        }
    }
    // Prepare the scorers for scoring. If 'force' is true, force them to recompute data even if they are already ready.
    async prepareScorers(force) {
        const releaseMutex = await (0, log_helpers_1.lockMutex)(this.scoreMutex, log_helpers_1.PREP_SCORERS);
        try {
            if (force || this.featureScorers.some(scorer => !scorer.isReady)) {
                const startTime = new Date();
                await Promise.all(this.featureScorers.map(scorer => scorer.fetchRequiredData()));
                (0, log_helpers_1.logInfo)(string_helpers_1.TELEMETRY, `${log_helpers_1.PREP_SCORERS} ready in ${(0, time_helpers_1.ageString)(startTime)}`);
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
        await Storage_1.default.set(types_1.StorageKey.TIMELINE, this.feed);
        return this.filterFeedAndSetInApp();
    }
    // The "load is finished" version of setLoadingStateVariables(). // TODO: there's too many state variables
    setLoadCompleteStateVariables() {
        if (this.loadStartedAt) {
            (0, log_helpers_1.logInfo)(string_helpers_1.TELEMETRY, `Finished home TL load w/ ${this.feed.length} toots ${(0, time_helpers_1.ageString)(this.loadStartedAt)}`);
            this.lastLoadTimeInSeconds = (0, time_helpers_1.ageInSeconds)(this.loadStartedAt);
            this.loadStartedAt = null;
        }
        else {
            this.lastLoadTimeInSeconds = null;
            console.warn(`[${string_helpers_1.TELEMETRY}] FINISHED LOAD... but loadStartedAt is null!`);
        }
    }
    // sets this.loadingStatus to a message indicating the current state of the feed
    // If isinitialCall is true:
    //    - sets this.catchupCheckpoint to the most recent toot in the feed
    //    - sets this.loadStartedAt to the current time
    setLoadingStateVariables(isInitialCall) {
        if (isInitialCall) {
            this.loadStartedAt = new Date();
            // If triggerFeedUpdate() is called with no maxId and no toots in the feed then it's an initial load.
            if (!this.feed.length) {
                this.loadingStatus = INITIAL_LOAD_STATUS;
                return;
            }
            // Otherwise if there's no maxId but there is already an existing feed array that means it's a refresh
            const mostRecentHomeTootAt = this.mostRecentHomeTootAt();
            // Don't set this.catchupCheckpoint before timelineCutoffAt() (the earliest date we'd want to pull from)
            if (mostRecentHomeTootAt < (0, time_helpers_1.timelineCutoffAt)()) {
                console.log(`${log_helpers_1.TRIGGER_FEED} isInitialCall but most recent toot ${mostRecentHomeTootAt} older than cutoff`);
                this.catchupCheckpoint = (0, time_helpers_1.timelineCutoffAt)();
            }
            else {
                this.catchupCheckpoint = mostRecentHomeTootAt;
            }
            this.loadingStatus = `new toots since ${(0, time_helpers_1.timeString)(this.catchupCheckpoint)}`;
        }
        else {
            this.loadingStatus = `more toots (retrieved ${this.feed.length.toLocaleString()} toots so far`;
            if (this.feed.length < Storage_1.default.getConfig().numDesiredTimelineToots) {
                this.loadingStatus += `, want ${Storage_1.default.getConfig().numDesiredTimelineToots.toLocaleString()}`;
            }
            this.loadingStatus += ')';
        }
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