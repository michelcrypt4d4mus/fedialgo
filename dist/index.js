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
const image_attachment_scorer_1 = __importDefault(require("./scorer/feature/image_attachment_scorer"));
const interactions_scorer_1 = __importDefault(require("./scorer/feature/interactions_scorer"));
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
const video_attachment_scorer_1 = __importDefault(require("./scorer/feature/video_attachment_scorer"));
const feed_filters_1 = require("./filters/feed_filters");
const weight_presets_1 = require("./scorer/weight_presets");
const string_helpers_1 = require("./helpers/string_helpers");
Object.defineProperty(exports, "GIFV", { enumerable: true, get: function () { return string_helpers_1.GIFV; } });
Object.defineProperty(exports, "VIDEO_TYPES", { enumerable: true, get: function () { return string_helpers_1.VIDEO_TYPES; } });
Object.defineProperty(exports, "extractDomain", { enumerable: true, get: function () { return string_helpers_1.extractDomain; } });
const api_1 = require("./api/api");
const weight_presets_2 = require("./scorer/weight_presets");
Object.defineProperty(exports, "PresetWeightLabel", { enumerable: true, get: function () { return weight_presets_2.PresetWeightLabel; } });
Object.defineProperty(exports, "PresetWeights", { enumerable: true, get: function () { return weight_presets_2.PresetWeights; } });
const config_1 = require("./config");
const time_helpers_1 = require("./helpers/time_helpers");
Object.defineProperty(exports, "timeString", { enumerable: true, get: function () { return time_helpers_1.timeString; } });
const types_1 = require("./types");
Object.defineProperty(exports, "MediaCategory", { enumerable: true, get: function () { return types_1.MediaCategory; } });
Object.defineProperty(exports, "WeightName", { enumerable: true, get: function () { return types_1.WeightName; } });
const INITIAL_STATUS_MSG = "(ready to load)";
const CLEANUP_FEED = "cleanupFeed()";
const GET_FEED = "getFeed()";
;
class TheAlgorithm {
    // Variables set in the constructor
    api;
    user;
    filters;
    setFeedInApp; // Optional callback to set the feed in the app using this package
    // Variables with initial values
    feed = [];
    catchupCheckpoint = null; // If doing a catch up refresh load we need to get back to this timestamp
    hasProvidedAnyTootsToClient = false; // Flag to indicate if the feed has been set in the app
    lastLoadTimeInSeconds = null; // Duration of the last load in seconds
    loadStartedAt = null; // Timestamp of when the feed started loading
    loadingStatus = INITIAL_STATUS_MSG; // String describing load activity (undefined means load complete)
    mastodonServers = {};
    mergeMutex = new async_mutex_1.Mutex();
    scoreMutex = new async_mutex_1.Mutex();
    trendingData = { links: [], tags: [], toots: [] };
    // These can score a toot without knowing about the rest of the toots in the feed
    featureScorers = [
        new chaos_scorer_1.default(),
        new followed_tags_scorer_1.default(),
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
    // This is the alternate constructor() that instantiates the class and loads the feed from storage.
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
        api_1.MastoApi.init(this.api, this.user);
        this.filters = (0, feed_filters_1.buildNewFilterSettings)();
    }
    // Merge a new batch of toots into the feed. Returns whatever toots are retrieve by tooFetcher
    async mergeTootsIntoFeed(tootFetcher, label) {
        const logPrefix = `mergeTootsIntoFeed() ${label}`;
        const startTime = new Date();
        let newToots = [];
        (0, string_helpers_1.logInfo)(logPrefix, `Called ${logPrefix}, state:`, this.statusDict());
        try {
            newToots = await tootFetcher;
            (0, string_helpers_1.logInfo)(logPrefix, `Found ${newToots.length} toots ${(0, time_helpers_1.inSeconds)(startTime)}, state:`, this.statusDict());
        }
        catch (e) {
            console.error(`${logPrefix} Error fetching toots:`, e);
        }
        // Only need to lock the mutex when we start modifying common variables like this.feed
        const releaseMutex = await this.mergeMutex.acquire();
        try {
            this.feed = await this.mergeTootsWithFeed(newToots);
            await this.scoreAndFilterFeed();
            (0, string_helpers_1.logInfo)(logPrefix, `Finished loading + merging ${newToots.length} toots ${(0, time_helpers_1.inSeconds)(startTime)}, state:`, this.statusDict());
            return newToots;
        }
        finally {
            releaseMutex();
        }
    }
    // Fetch toots from followed accounts plus trending toots in the fediverse, then score and sort them
    // TODO: this will stop pulling toots before it fills in the gap back to the last of the user's actual timeline toots.
    async getFeed(numTimelineToots, maxId) {
        const logPrefix = `${GET_FEED}`;
        (0, string_helpers_1.logInfo)(logPrefix, `called (numTimelineToots=${numTimelineToots}, maxId=${maxId})`);
        numTimelineToots ??= Storage_1.default.getConfig().numTootsInFirstFetch;
        // If this is the first call to getFeed() also fetch the UserData (followed accts, blocks, etc.)
        if (!maxId) {
            this.loadStartedAt = new Date();
            // If getFeed() is called with no maxId and no toots in the feed then it's an initial load.
            if (!this.feed.length) {
                this.loadingStatus = "initial data";
                // Otherwise if there's no maxId but there is already an existing feed array that means it's a refresh
            }
            else if (this.feed.length) {
                this.catchupCheckpoint = this.mostRecentHomeTootAt();
                this.loadingStatus = `new toots since ${(0, time_helpers_1.timeString)(this.catchupCheckpoint)}`;
                console.info(`${logPrefix} Set catchupCheckpoint marker. Current state:`, this.statusDict());
            }
            // These are all calls we should only make in the initial load (all called asynchronously)
            this.prepareScorers();
            this.mergeTootsIntoFeed(mastodon_server_1.default.fediverseTrendingToots(), "fediverseTrendingToots");
            this.mergeTootsIntoFeed(api_1.MastoApi.instance.getRecentTootsForTrendingTags(), "getRecentTootsForTrendingTags");
            mastodon_server_1.default.getMastodonServersInfo().then((servers) => this.mastodonServers = servers);
            mastodon_server_1.default.getTrendingData().then((trendingData) => this.trendingData = trendingData);
        }
        else {
            this.loadingStatus = `more toots (retrieved ${this.feed.length} toots so far`;
            this.loadingStatus += `, want ${Storage_1.default.getConfig().maxTimelineTootsToFetch})`;
        }
        this.mergeTootsIntoFeed(api_1.MastoApi.instance.fetchHomeFeed(numTimelineToots, maxId), "fetchHomeFeed").then((newToots) => {
            (0, string_helpers_1.logInfo)(logPrefix, `fetchHomeFeed returned ${newToots.length} toots ${(0, time_helpers_1.inSeconds)(this.loadStartedAt)}, now maybeGetMoreToots()`);
            this.maybeGetMoreToots(newToots, numTimelineToots || Storage_1.default.getConfig().numTootsInFirstFetch);
        });
        return this.feed; // TODO: This should be unnecessary
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
        await Storage_1.default.clearAll();
        this.hasProvidedAnyTootsToClient = false;
        this.loadingStatus = INITIAL_STATUS_MSG;
        this.loadStartedAt = null;
        this.mastodonServers = {};
        this.catchupCheckpoint = null;
        await this.loadCachedData();
    }
    // Helper method to return the URL for a given tag on the local server
    // TODO: should probably be a static method?
    buildTagURL(tag) {
        return `https://${api_1.MastoApi.instance.homeDomain}/tags/${tag.name}`;
    }
    // Return the timestamp of the most recent toot from followed accounts ONLY
    mostRecentHomeTootAt() {
        return (0, toot_1.mostRecentTootedAt)(this.feed.filter(toot => toot.isFollowed));
    }
    // Remove invalid and duplicate toots
    async mergeTootsWithFeed(toots) {
        const cleanNewToots = toots.filter(toot => toot.isValidForFeed());
        (0, string_helpers_1.logTootRemoval)(CLEANUP_FEED, "invalid", toots.length - cleanNewToots.length, cleanNewToots.length);
        toots = toot_1.default.dedupeToots([...this.feed, ...cleanNewToots], CLEANUP_FEED);
        this.filters = (0, feed_filters_1.initializeFiltersWithSummaryInfo)(toots, await api_1.MastoApi.instance.getUserData());
        return toots;
    }
    // Filter the feed based on the user's settings. Has the side effect of calling the setFeedInApp() callback
    // that will send the client using this library the filtered subset of Toots (this.feed will always maintain
    // the master timeline).
    filterFeedAndSetInApp() {
        const filteredFeed = this.feed.filter(toot => toot.isInTimeline(this.filters));
        console.debug(`[filterFeed()] found ${filteredFeed.length} valid toots of ${this.feed.length}...`);
        this.setFeedInApp(filteredFeed);
        if (!this.hasProvidedAnyTootsToClient) {
            this.hasProvidedAnyTootsToClient = true;
            (0, string_helpers_1.logInfo)(`TELEMETRY`, `First ${filteredFeed.length} toots sent to client ${(0, time_helpers_1.inSeconds)(this.loadStartedAt)}`);
        }
        return filteredFeed;
    }
    // Load cached data from storage. This is called when the app is first opened and when reset() is called.
    async loadCachedData() {
        this.feed = (await Storage_1.default.getFeed()) ?? [];
        this.filters = await Storage_1.default.getFilters();
        this.trendingData = await Storage_1.default.getTrending();
        this.setFeedInApp(this.feed);
        console.log(`[fedialgo] loaded ${this.feed.length} timeline toots from cache, trendingData:`, this.trendingData);
    }
    // Asynchronously fetch more toots if we have not reached the requred # of toots
    // and the last request returned the full requested count
    async maybeGetMoreToots(newHomeToots, numTimelineToots) {
        const maxTimelineTootsToFetch = Storage_1.default.getConfig().maxTimelineTootsToFetch;
        const earliestNewHomeTootAt = (0, toot_1.earliestTootedAt)(newHomeToots);
        let logPrefix = `[maybeGetMoreToots()]`;
        // Stop if we have enough toots or the last request didn't return the full requested count (minus 2)
        if (Storage_1.default.getConfig().enableIncrementalLoad // TODO: we don't need this config option any more
            && (
            // Check newHomeToots is bigger than (numTimelineToots - 3) bc sometimes we get e.g. 39 records instead of 40
            // but if we got like, 5 toots, that means we've exhausted the user's timeline and there's nothing more to fetch
            (this.feed.length < maxTimelineTootsToFetch && newHomeToots.length >= (numTimelineToots - 3))
                // Alternatively check if the earliest new home toot is newer than the catchup checkpoint. If it is
                // we should continue fetching more toots.
                || (this.catchupCheckpoint && earliestNewHomeTootAt && earliestNewHomeTootAt > this.catchupCheckpoint))) {
            setTimeout(() => {
                // Use the 4th toot bc sometimes there are weird outliers. Dupes will be removed later.
                // It's important that we *only* look at home timeline toots here. Toots from other servers
                // will have different ID schemes and we can't rely on them to be in order.
                const tootWithMaxId = (0, toot_1.sortByCreatedAt)(newHomeToots)[4];
                let msg = `Calling ${GET_FEED} recursively, newHomeToots has ${newHomeToots.length} toots`;
                msg += `(want ${maxTimelineTootsToFetch})`;
                console.log(`${logPrefix} ${msg}. state:`, this.statusDict());
                this.getFeed(numTimelineToots, tootWithMaxId.id);
            }, Storage_1.default.getConfig().incrementalLoadDelayMS);
        }
        else {
            logPrefix += ` Halting ${GET_FEED}:`;
            if (!Storage_1.default.getConfig().enableIncrementalLoad) {
                console.log(`${logPrefix} Incremental loading is fully disabled`);
            }
            else if (this.catchupCheckpoint) {
                if (earliestNewHomeTootAt && earliestNewHomeTootAt < this.catchupCheckpoint) {
                    let tmpCheckpoint = this.catchupCheckpoint;
                    this.catchupCheckpoint = null;
                    let msg = `${logPrefix} all caught up: oldest new toot ${(0, time_helpers_1.quotedISOFmt)(earliestNewHomeTootAt)}`;
                    console.log(`${msg} older than checkpoint ${(0, time_helpers_1.quotedISOFmt)(tmpCheckpoint)}. state:`, this.statusDict());
                }
                else {
                    console.warn(`${logPrefix} but NOT caught up to catchupCheckpoint! state:`, this.statusDict());
                }
            }
            else if (this.feed.length >= maxTimelineTootsToFetch) {
                console.log(`${logPrefix} have enough toots (wanted ${maxTimelineTootsToFetch}), state:`, this.statusDict());
            }
            else {
                let msg = `${logPrefix} stopping because fetch only got ${newHomeToots.length} toots`;
                console.log(`${msg}, expected ${numTimelineToots}. state:`, this.statusDict());
            }
            if (this.loadStartedAt) {
                (0, string_helpers_1.logInfo)(`TELEMETRY`, `Finished loading ${this.feed.length} toots ${(0, time_helpers_1.inSeconds)(this.loadStartedAt)}`);
                this.lastLoadTimeInSeconds = (0, time_helpers_1.ageInSeconds)(this.loadStartedAt);
                this.loadStartedAt = null;
            }
            else {
                console.warn(`[TELEMETRY] FINISHED LOAD... but loadStartedAt is null!`);
            }
            this.loadingStatus = null;
        }
    }
    // Prepare the scorers for scoring.
    async prepareScorers() {
        const releaseMutex = await this.scoreMutex.acquire();
        const logPrefix = `prepareScorers()`;
        try {
            if (this.featureScorers.some(scorer => !scorer.isReady)) {
                const startTime = new Date();
                // logInfo(logPrefix, `ASYNC triggering FeatureScorers.fetchRequiredData()`);
                await Promise.all(this.featureScorers.map(scorer => scorer.fetchRequiredData()));
                (0, string_helpers_1.logInfo)(logPrefix, `TELEMETRY Scorers prepared ${(0, time_helpers_1.inSeconds)(startTime)}`);
            }
            else {
                // console.debug(`${(new Date().toISOString())} [prepareScorers()]  FeatureScorers already ready`);
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
    async scoreAndFilterFeed() {
        await this.prepareScorers();
        this.feed = await scorer_1.default.scoreToots(this.feed, this.featureScorers, this.feedScorers);
        this.feed = this.feed.slice(0, Storage_1.default.getConfig().maxNumCachedToots);
        await Storage_1.default.setFeed(this.feed);
        return this.filterFeedAndSetInApp();
    }
    // Simple string with important feed status information
    statusMsg() {
        return Object.entries(this.statusDict()).map((k, v) => `${k}=${v}`).join(", ");
    }
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