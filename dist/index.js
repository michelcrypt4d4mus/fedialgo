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
exports.extractDomain = exports.WeightName = exports.TypeFilterName = exports.Toot = exports.TheAlgorithm = exports.PropertyName = exports.PropertyFilter = exports.PresetWeights = exports.PresetWeightLabel = exports.NumericFilter = exports.MediaCategory = exports.Account = exports.VIDEO_TYPES = exports.GIFV = void 0;
/*
 * Main class that handles scoring and sorting a feed made of Toot objects.
 */
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
const collection_helpers_1 = require("./helpers/collection_helpers");
const config_1 = require("./config");
const time_helpers_1 = require("./helpers/time_helpers");
const types_1 = require("./types");
Object.defineProperty(exports, "MediaCategory", { enumerable: true, get: function () { return types_1.MediaCategory; } });
Object.defineProperty(exports, "WeightName", { enumerable: true, get: function () { return types_1.WeightName; } });
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
    loadingStatus = "(ready to load)"; // String describing load activity (undefined means load complete)
    mastodonServers = {};
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
        algo.feed = (await Storage_1.default.getFeed()) ?? [];
        algo.setFeedInApp(algo.feed);
        algo.filters = await Storage_1.default.getFilters();
        algo.trendingData = await Storage_1.default.getTrending();
        console.log(`[fedialgo] loaded ${algo.feed.length} timeline toots from cache, trendingData=`, algo.trendingData);
        return algo;
    }
    constructor(params) {
        this.api = params.api;
        this.user = params.user;
        this.setFeedInApp = params.setFeedInApp ?? ((f) => console.debug(`Default setFeedInApp() called`));
        api_1.MastoApi.init(this.api, this.user);
        this.filters = (0, feed_filters_1.buildNewFilterSettings)();
    }
    // Fetch toots from followed accounts plus trending toots in the fediverse, then score and sort them
    // TODO: this will stop pulling toots before it fills in the gap back to the last of the user's actual timeline toots.
    async getFeed(numTimelineToots, maxId) {
        console.debug(`[fedialgo] getFeed() called (numTimelineToots=${numTimelineToots}, maxId=${maxId})`);
        numTimelineToots = numTimelineToots || Storage_1.default.getConfig().numTootsInFirstFetch;
        // ORDER MATTERS! The results of these Promises are processed with shift()
        let dataFetches = [
            api_1.MastoApi.instance.fetchHomeFeed(numTimelineToots, maxId),
            api_1.MastoApi.instance.getUserData(),
        ];
        // If this is the first call to getFeed() also fetch the UserData (followed accts, blocks, etc.)
        if (!maxId) {
            // If getFeed() is called with no maxId and no toots in the feed then it's an initial load.
            if (!this.feed.length) {
                this.loadingStatus = "initial data";
                // Otherwise if there's no maxId but there is already an existing feed array that means it's a refresh
            }
            else if (this.feed.length) {
                this.catchupCheckpoint = this.mostRecentHomeTootAt();
                console.log(`Set catchupCheckpoint to ${(0, time_helpers_1.toISOFormat)(this.catchupCheckpoint)} (${this.feed.length} in feed)`);
                this.loadingStatus = `any new toots back to ${(0, time_helpers_1.toISOFormat)(this.catchupCheckpoint)}`;
            }
            // ORDER MATTERS! The results of these Promises are processed with shift()
            // TODO: should we really make the user wait for the initial load to get all trending toots?
            dataFetches = dataFetches.concat([
                mastodon_server_1.default.fediverseTrendingToots(),
                api_1.MastoApi.instance.getRecentTootsForTrendingTags(),
                ...this.featureScorers.map(scorer => scorer.fetchRequiredData()),
            ]);
        }
        else {
            this.loadingStatus = `more toots (retrieved ${this.feed.length} so far)`;
        }
        const allResponses = await Promise.all(dataFetches);
        const newHomeToots = allResponses.shift(); // pop getTimelineToots() response from front of allResponses array
        const userData = allResponses.shift();
        const trendingToots = allResponses.length ? allResponses.shift().concat(allResponses.shift()) : [];
        const retrievedToots = [...newHomeToots, ...trendingToots];
        this.logTootCounts(retrievedToots, newHomeToots);
        // trendingData and mastodonServers should be getting loaded from cached data in local storage
        // as the initial fetch happened in the course of getting the trending toots.
        this.mastodonServers = await mastodon_server_1.default.getMastodonServersInfo();
        this.trendingData = await mastodon_server_1.default.getTrendingData();
        // Filter out dupe/invalid toots, build filters
        this.feed = this.cleanupFeed(retrievedToots);
        this.filters = (0, feed_filters_1.initializeFiltersWithSummaryInfo)(this.feed, userData);
        // Potentially fetch more toots if we haven't reached the desired number
        this.maybeGetMoreToots(newHomeToots, numTimelineToots); // Called asynchronously
        return this.scoreFeed.bind(this)();
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
        return this.filterFeed();
    }
    // Update user weightings and rescore / resort the feed.
    async updateUserWeights(userWeights) {
        console.log("updateUserWeights() called with weights:", userWeights);
        await Storage_1.default.setWeightings(userWeights);
        return this.scoreFeed.bind(this)();
    }
    // Update user weightings to one of the preset values and rescore / resort the feed.
    async updateUserWeightsToPreset(presetName) {
        console.log("updateUserWeightsToPreset() called with presetName:", presetName);
        return await this.updateUserWeights(weight_presets_2.PresetWeights[presetName]);
    }
    // Helper method to return the URL for a given tag on the local server
    buildTagURL(tag) {
        return `https://${api_1.MastoApi.instance.homeDomain}/tags/${tag.name}`;
    }
    // Return the timestamp of the most recent toot from followed accounts ONLY
    mostRecentHomeTootAt() {
        return (0, toot_1.mostRecentTootedAt)(this.feed.filter(toot => toot.isFollowed));
    }
    // Remove invalid and duplicate toots
    cleanupFeed(toots) {
        const cleanNewToots = toots.filter(toot => toot.isValidForFeed());
        (0, string_helpers_1.logTootRemoval)("cleanupFeed()", "invalid", toots.length - cleanNewToots.length, cleanNewToots.length);
        return toot_1.default.dedupeToots([...this.feed, ...cleanNewToots], "getFeed");
    }
    // Filter the feed based on the user's settings. Has the side effect of calling the setFeedInApp() callback.
    filterFeed() {
        const filteredFeed = this.feed.filter(toot => toot.isInTimeline(this.filters));
        console.debug(`filteredFeed() found ${filteredFeed.length} valid toots of ${this.feed.length}...`);
        this.setFeedInApp(filteredFeed);
        return filteredFeed;
    }
    // Asynchronously fetch more toots if we have not reached the requred # of toots
    // and the last request returned the full requested count
    async maybeGetMoreToots(newHomeToots, numTimelineToots) {
        const maxTimelineTootsToFetch = Storage_1.default.getConfig().maxTimelineTootsToFetch;
        const checkpointStr = (0, time_helpers_1.toISOFormat)(this.catchupCheckpoint);
        const earliestNewHomeTootAt = (0, toot_1.earliestTootedAt)(newHomeToots);
        console.log(`[maybeGetMoreToots] TL has ${this.feed.length} toots, want ${maxTimelineTootsToFetch} (catchupCheckpoint='${checkpointStr}')`);
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
                let msg = `calling getFeed() recursively, current catchupCheckpoint: '${(0, time_helpers_1.toISOFormat)(this.catchupCheckpoint)}'`;
                console.debug(`${msg}, current newHomeToots:`, newHomeToots);
                this.getFeed(numTimelineToots, tootWithMaxId.id);
            }, Storage_1.default.getConfig().incrementalLoadDelayMS);
        }
        else {
            const logPrefx = `[maybeGetMoreToots() - halting getFeed()]`;
            const earliestAtStr = `(earliestNewHomeTootAt '${(0, time_helpers_1.toISOFormat)(earliestNewHomeTootAt)}')`;
            if (!Storage_1.default.getConfig().enableIncrementalLoad) {
                console.log(`${logPrefx} incremental loading disabled`);
            }
            else if (this.catchupCheckpoint) {
                if (earliestNewHomeTootAt && earliestNewHomeTootAt < this.catchupCheckpoint) {
                    console.log(`${logPrefx} caught up to catchupCheckpoint '${checkpointStr}' ${earliestAtStr}`);
                    this.catchupCheckpoint = null;
                }
                else {
                    console.warn(`Not caught up to catchupCheckpoint '${checkpointStr}' ${earliestAtStr}`);
                }
            }
            else if (this.feed.length >= maxTimelineTootsToFetch) {
                console.log(`${logPrefx} we have ${this.feed.length} toots`);
            }
            else {
                console.log(`${logPrefx} fetch only got ${newHomeToots.length} toots (expected ${numTimelineToots})`);
            }
            this.loadingStatus = undefined;
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
    // Inject scoreInfo property to each Toot, sort feed based on scores, and save feed to browser storage.
    async scoreFeed() {
        const logPrefix = `scoreFeed()`;
        console.debug(`${logPrefix} called (${this.feed.length} toots currently in feed)...`);
        try {
            // Lock a mutex to prevent multiple scoring loops to call the DiversityFeedScorer simultaneously
            this.scoreMutex.cancel();
            const releaseMutex = await this.scoreMutex.acquire();
            try {
                // Feed scorers' data must be refreshed each time the feed changes
                this.feedScorers.forEach(scorer => scorer.extractScoreDataFromFeed(this.feed));
                await (0, collection_helpers_1.processPromisesBatch)(this.feed, Storage_1.default.getConfig().scoringBatchSize, async (toot) => await scorer_1.default.decorateWithScoreInfo(toot, this.weightedScorers));
                // Sort feed based on score from high to low.
                this.feed.sort((a, b) => (b.scoreInfo?.score ?? 0) - (a.scoreInfo?.score ?? 0));
                this.feed = this.feed.slice(0, Storage_1.default.getConfig().maxNumCachedToots);
                Storage_1.default.setFeed(this.feed);
            }
            finally {
                releaseMutex();
            }
        }
        catch (e) {
            if (e == async_mutex_1.E_CANCELED) {
                console.debug(`${logPrefix} mutex cancellation`);
            }
            else {
                console.warn(`${logPrefix} caught error:`, e);
            }
        }
        return this.filterFeed();
    }
    // Utility method to log progress of getFeed() calls
    logTootCounts(toots, newHomeToots) {
        const numFollowedAccts = Object.keys(api_1.MastoApi.instance.userData?.followedAccounts || []).length;
        let msg = [
            `Got ${toots.length} new toots from ${numFollowedAccts} followed accts`,
            `${newHomeToots.length} new home toots`,
            `${toots.length} total new toots`,
            `this.feed has ${this.feed.length} toots`,
        ];
        console.log(msg.join(', '));
    }
}
exports.TheAlgorithm = TheAlgorithm;
;
//# sourceMappingURL=index.js.map