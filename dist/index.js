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
exports.accountNameWithEmojis = exports.WeightName = exports.TypeFilterName = exports.Toot = exports.TheAlgorithm = exports.PropertyName = exports.PropertyFilter = exports.NumericFilter = exports.TRENDING = exports.TIME_DECAY = void 0;
/*
 * Main class that handles scoring and sorting a feed made of Toot objects.
 */
const async_mutex_1 = require("async-mutex");
const chaos_scorer_1 = __importDefault(require("./scorer/feature/chaos_scorer"));
const diversity_feed_scorer_1 = __importDefault(require("./scorer/feed/diversity_feed_scorer"));
const followed_tags_scorer_1 = __importDefault(require("./scorer/feature/followed_tags_scorer"));
const image_attachment_scorer_1 = __importDefault(require("./scorer/feature/image_attachment_scorer"));
const interactions_scorer_1 = __importDefault(require("./scorer/feature/interactions_scorer"));
const mentions_followed_scorer_1 = __importDefault(require("./scorer/feature/mentions_followed_scorer"));
const most_favorited_accounts_scorer_1 = __importDefault(require("./scorer/feature/most_favorited_accounts_scorer"));
const most_replied_accounts_scorer_1 = __importDefault(require("./scorer/feature/most_replied_accounts_scorer"));
const numeric_filter_1 = __importDefault(require("./filters/numeric_filter"));
exports.NumericFilter = numeric_filter_1.default;
const num_favorites_scorer_1 = __importDefault(require("./scorer/feature/num_favorites_scorer"));
const num_replies_scorer_1 = __importDefault(require("./scorer/feature/num_replies_scorer"));
const num_retoots_scorer_1 = __importDefault(require("./scorer/feature/num_retoots_scorer"));
const property_filter_1 = __importStar(require("./filters/property_filter"));
exports.PropertyFilter = property_filter_1.default;
Object.defineProperty(exports, "PropertyName", { enumerable: true, get: function () { return property_filter_1.PropertyName; } });
Object.defineProperty(exports, "TypeFilterName", { enumerable: true, get: function () { return property_filter_1.TypeFilterName; } });
const retooted_users_scorer_1 = __importDefault(require("./scorer/feature/retooted_users_scorer"));
const retoots_in_feed_scorer_1 = __importDefault(require("./scorer/feed/retoots_in_feed_scorer"));
const scorer_1 = __importDefault(require("./scorer/scorer"));
const Storage_1 = __importDefault(require("./Storage"));
const toot_1 = __importStar(require("./api/objects/toot"));
exports.Toot = toot_1.default;
const trending_links_scorer_1 = __importDefault(require("./scorer/feature/trending_links_scorer"));
const trending_tags_scorer_1 = __importDefault(require("./scorer/feature/trending_tags_scorer"));
const trending_toots_scorer_1 = __importDefault(require("./scorer/feature/trending_toots_scorer"));
const video_attachment_scorer_1 = __importDefault(require("./scorer/feature/video_attachment_scorer"));
const account_1 = require("./api/objects/account");
Object.defineProperty(exports, "accountNameWithEmojis", { enumerable: true, get: function () { return account_1.accountNameWithEmojis; } });
const account_2 = require("./api/objects/account");
const helpers_1 = require("./helpers");
const config_1 = require("./config");
const api_1 = require("./api/api");
const types_1 = require("./types");
Object.defineProperty(exports, "WeightName", { enumerable: true, get: function () { return types_1.WeightName; } });
const TIME_DECAY = types_1.WeightName.TIME_DECAY;
exports.TIME_DECAY = TIME_DECAY;
const TRENDING = types_1.WeightName.TRENDING;
exports.TRENDING = TRENDING;
class TheAlgorithm {
    api;
    user;
    filters;
    // Variables with initial values
    feed = [];
    followedAccounts = {};
    followedTags = {};
    mutedAccounts = {};
    scoreMutex = new async_mutex_1.Mutex();
    serverSideFilters = [];
    trendingLinks = [];
    trendingTags = [];
    trendingToots = [];
    // Optional callback to set the feed in the code using this package
    setFeedInApp = (f) => console.debug(`Default setFeedInApp() called...`);
    followedTagsScorer = new followed_tags_scorer_1.default();
    mentionsFollowedScorer = new mentions_followed_scorer_1.default();
    // These can score a toot without knowing about the rest of the toots in the feed
    featureScorers = [
        new trending_links_scorer_1.default(),
        this.followedTagsScorer,
        this.mentionsFollowedScorer,
        new chaos_scorer_1.default(),
        new image_attachment_scorer_1.default(),
        new interactions_scorer_1.default(),
        new most_favorited_accounts_scorer_1.default(),
        new most_replied_accounts_scorer_1.default(),
        new num_favorites_scorer_1.default(),
        new num_replies_scorer_1.default(),
        new num_retoots_scorer_1.default(),
        new retooted_users_scorer_1.default(),
        new trending_tags_scorer_1.default(),
        new trending_toots_scorer_1.default(),
        new video_attachment_scorer_1.default(),
    ];
    // These scorers require the complete feed to work properly
    feedScorers = [
        new diversity_feed_scorer_1.default(),
        new retoots_in_feed_scorer_1.default(),
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
        [TIME_DECAY]: Object.assign({}, config_1.DEFAULT_WEIGHTS[TIME_DECAY]),
        [TRENDING]: Object.assign({}, config_1.DEFAULT_WEIGHTS[TRENDING]),
    });
    // This is the alternate constructor() that instantiates the class and loads the feed from storage.
    static async create(params) {
        await Storage_1.default.setIdentity(params.user);
        await Storage_1.default.logAppOpen();
        const algo = new TheAlgorithm(params);
        await algo.setDefaultWeights();
        algo.feed = await Storage_1.default.getFeed();
        algo.filters = await Storage_1.default.getFilters();
        // Set trending data properties
        const trendingData = await Storage_1.default.getTrending();
        algo.trendingLinks = trendingData.links;
        algo.trendingTags = trendingData.tags;
        algo.trendingToots = trendingData.toots;
        console.log(`[fedialgo] create() loaded feed with ${algo.feed.length} toots`, algo.feed.slice(0, 100));
        algo.followedAccounts = (0, account_2.buildAccountNames)((await Storage_1.default.getFollowedAccts()));
        algo.extractSummaryInfo();
        algo.setFeedInApp(algo.feed);
        return algo;
    }
    constructor(params) {
        this.api = params.api;
        this.user = params.user;
        this.setFeedInApp = params.setFeedInApp ?? this.setFeedInApp;
        api_1.MastoApi.init(this.api, this.user);
        this.filters = (0, config_1.buildNewFilterSettings)();
    }
    // Fetch toots from followed accounts plus trending toots in the fediverse, then score and sort them
    async getFeed(numTimelineToots, maxId) {
        console.debug(`[fedialgo] getFeed() called (numTimelineToots=${numTimelineToots}, maxId=${maxId})`);
        numTimelineToots = numTimelineToots || Storage_1.default.getConfig().numTootsInFirstFetch;
        let dataFetches = [api_1.MastoApi.instance.getTimelineToots(numTimelineToots, maxId)];
        // If this is the first call to getFeed(), also fetch the user's followed accounts and tags
        if (!maxId) {
            dataFetches = dataFetches.concat([
                api_1.MastoApi.instance.getStartupData(),
                // FeatureScorers return empty arrays; they're just here for load time parallelism
                ...this.featureScorers.map(scorer => scorer.fetchRequiredData()),
            ]);
        }
        const allResponses = await Promise.all(dataFetches);
        console.debug(`getFeed() allResponses:`, allResponses);
        const { homeToots, otherToots, trendingTags, trendingToots } = allResponses.shift(); // pop getTimelineToots() response
        const newToots = [...homeToots, ...otherToots];
        // Store trending data so it's accessible to client if page is reloaded
        this.trendingLinks = this.featureScorers[0].trendingLinks;
        this.trendingTags = trendingTags?.length ? trendingTags : this.trendingTags;
        this.trendingToots = trendingToots?.length ? trendingToots : this.trendingToots;
        Storage_1.default.setTrending(this.trendingLinks, this.trendingTags, this.trendingToots);
        // This if condition should be equivalent to the if (!maxId) above
        if (allResponses.length > 0) {
            const userData = allResponses.shift();
            this.mutedAccounts = userData.mutedAccounts;
            this.serverSideFilters = userData.serverSideFilters;
            // Pull followed accounts and tags from the scorers
            this.followedAccounts = (0, account_2.buildAccountNames)(this.mentionsFollowedScorer.followedAccounts);
            this.followedTags = this.followedTagsScorer.requiredData;
        }
        this.logTootCounts(newToots, homeToots);
        // Remove stuff already retooted, invalid future timestamps, nulls, etc.
        let cleanNewToots = newToots.filter(toot => toot.isValidForFeed(this));
        const numRemoved = newToots.length - cleanNewToots.length;
        console.log(`Removed ${numRemoved} invalid toots leaving ${cleanNewToots.length}`);
        const cleanFeed = toot_1.default.dedupeToots([...this.feed, ...cleanNewToots], "getFeed");
        this.feed = cleanFeed.slice(0, Storage_1.default.getConfig().maxNumCachedToots);
        this.extractSummaryInfo();
        this.maybeGetMoreToots(homeToots, numTimelineToots); // Called asynchronously
        return this.scoreFeed.bind(this)();
    }
    // Return the user's current weightings for each score category
    async getUserWeights() {
        return await Storage_1.default.getWeightings();
    }
    // Update user weightings and rescore / resort the feed.
    async updateUserWeights(userWeights) {
        console.log("updateUserWeights() called with weights:", userWeights);
        await Storage_1.default.setWeightings(userWeights);
        return this.scoreFeed.bind(this)();
    }
    // TODO: maybe this should be a copy so edits don't happen in place?
    getFilters() {
        return this.filters;
    }
    updateFilters(newFilters) {
        console.log(`updateFilters() called with newFilters: `, newFilters);
        this.filters = newFilters;
        Storage_1.default.setFilters(newFilters);
        return this.filterFeed();
    }
    // Filter the feed based on the user's settings. Has the side effect of calling the setFeedInApp() callback.
    filterFeed() {
        const filteredFeed = this.feed.filter(toot => toot.isInTimeline(this.filters));
        console.log(`filteredFeed() found ${filteredFeed.length} valid toots of ${this.feed.length}...`);
        this.setFeedInApp(filteredFeed);
        return filteredFeed;
    }
    // Debugging method to log info about the timeline toots
    logFeedInfo(prefix = "") {
        prefix = prefix.length == 0 ? prefix : `${prefix} `;
        console.log(`${prefix}timeline toots (condensed):`, this.feed.map(t => t.condensedStatus()));
        console.log(`${prefix}timeline toots filters, including counts:`, this.filters);
    }
    // Compute language, app, etc. counts.
    extractSummaryInfo() {
        const tootCounts = Object.values(property_filter_1.PropertyName).reduce((counts, propertyName) => {
            // Instantiate missing filter sections  // TODO: maybe this should happen in Storage?
            this.filters.filterSections[propertyName] ??= new property_filter_1.default({ title: propertyName });
            counts[propertyName] = {};
            return counts;
        }, {});
        this.feed.forEach(toot => {
            toot.isFollowed = toot.account.acct in this.followedAccounts; // Set isFollowed flag
            (0, helpers_1.incrementCount)(tootCounts[property_filter_1.PropertyName.APP], toot.application.name);
            (0, helpers_1.incrementCount)(tootCounts[property_filter_1.PropertyName.LANGUAGE], toot.language);
            (0, helpers_1.incrementCount)(tootCounts[property_filter_1.PropertyName.USER], toot.account.acct);
            // Lowercase and count tags
            toot.tags.forEach((tag) => {
                toot.followedTags ??= []; // TODO why do i need this to make typescript happy?
                if (tag.name in this.followedTags)
                    toot.followedTags.push(tag);
                (0, helpers_1.incrementCount)(tootCounts[property_filter_1.PropertyName.HASHTAG], tag.name);
            });
            // Aggregate type counts
            Object.entries(property_filter_1.TYPE_FILTERS).forEach(([name, typeFilter]) => {
                if (typeFilter(toot)) {
                    (0, helpers_1.incrementCount)(tootCounts[property_filter_1.PropertyName.TYPE], name);
                }
            });
            // Aggregate server-side filter counts
            this.serverSideFilters.forEach((filter) => {
                filter.keywords.forEach((keyword) => {
                    if (toot.containsString(keyword.keyword)) {
                        console.debug(`Matched server filter (${toot.describe()}):`, filter);
                        (0, helpers_1.incrementCount)(tootCounts[property_filter_1.PropertyName.SERVER_SIDE_FILTERS], keyword.keyword);
                    }
                });
            });
        });
        // TODO: if there's a validValues element for a filter section that is no longer in the feed
        //       the user will not be presented with the option to turn it off. This is a bug.
        Object.entries(tootCounts).forEach(([propertyName, counts]) => {
            this.filters.filterSections[propertyName].setOptions(counts);
        });
        Storage_1.default.setFilters(this.filters);
        console.debug(`repairFeedAndExtractSummaryInfo() completed, built filters:`, this.filters);
    }
    mostRecentTootAt() {
        return (0, toot_1.mostRecentTootedAt)(this.feed);
    }
    // Return the URL for a given tag on the local server
    buildTagURL(tag) {
        return `https://${api_1.MastoApi.instance.homeDomain}/tags/${tag.name}`;
    }
    // Asynchronously fetch more toots if we have not reached the requred # of toots
    // and the last request returned the full requested count
    async maybeGetMoreToots(newHomeToots, numTimelineToots) {
        const maxTimelineTootsToFetch = Storage_1.default.getConfig().maxTimelineTootsToFetch;
        console.log(`Have ${this.feed.length} toots in timeline, want ${maxTimelineTootsToFetch}...`);
        // Stop if we have enough toots or the last request didn't return the full requested count (minus 2)
        if (Storage_1.default.getConfig().enableIncrementalLoad
            && this.feed.length < maxTimelineTootsToFetch
            && newHomeToots.length >= (numTimelineToots - 3) // Sometimes we get 39 records instead of 40 at a time
        ) {
            setTimeout(() => {
                // Use the 5th toot bc sometimes there are weird outliers. Dupes will be removed later.
                // It's important that we *only* look at home timeline toots here. Toots from other servers
                // will have different ID schemes and we can't rely on them to be in order.
                const tootWithMaxId = (0, toot_1.sortByCreatedAt)(newHomeToots)[5];
                console.log(`calling getFeed() recursively, current newHomeToots:`, newHomeToots);
                this.getFeed(numTimelineToots, tootWithMaxId.id);
            }, Storage_1.default.getConfig().incrementalLoadDelayMS);
        }
        else {
            if (!Storage_1.default.getConfig().enableIncrementalLoad) {
                console.log(`halting getFeed(): incremental loading disabled`);
            }
            else if (this.feed.length >= maxTimelineTootsToFetch) {
                console.log(`halting getFeed(): we have ${this.feed.length} toots`);
            }
            else {
                console.log(`halting getFeed(): fetch only got ${newHomeToots.length} toots (expected ${numTimelineToots})`);
            }
        }
    }
    // Load weightings from storage. Set defaults for any missing weightings.
    async setDefaultWeights() {
        let weightings = await Storage_1.default.getWeightings();
        let shouldSetWeights = false;
        Object.keys(this.scorersDict).forEach((key) => {
            const value = weightings[key];
            if (!value && value !== 0) {
                weightings[key] = this.scorersDict[key].defaultWeight;
                shouldSetWeights = true;
            }
        });
        // If any changes were made to the Storage weightings, save them back to storage
        if (shouldSetWeights)
            await Storage_1.default.setWeightings(weightings);
    }
    // Injecting the scoreInfo property to each toot. Sort feed based on toot scores.
    async scoreFeed() {
        const logPrefix = `scoreFeed() [${(0, helpers_1.createRandomString)(5)}]`;
        console.debug(`${logPrefix} called in fedialgo package...`);
        try {
            // Lock a mutex to prevent multiple scoring loops to call the DiversityFeedScorer simultaneously
            this.scoreMutex.cancel();
            const releaseMutex = await this.scoreMutex.acquire();
            try {
                // TODO: DiversityFeedScorer mutates its state as it scores so setFeed() must be reset
                let promises = this.feedScorers.map(scorer => scorer.setFeed(this.feed));
                if (!this.featureScorers.every(scorer => scorer.isReady)) {
                    console.warn(`For some reasons FeaturesScorers are not ready. Making it so...`);
                    promises = promises.concat(this.featureScorers.map(scorer => scorer.fetchRequiredData()));
                }
                await Promise.all(promises);
                // TODO: DiversityFeedScorer mutations are problematic when used with Promise.all() so use a loop
                for (const toot of this.feed) {
                    await scorer_1.default.decorateWithScoreInfo(toot, this.weightedScorers);
                }
                // Sort feed based on score from high to low.
                this.feed.sort((a, b) => (b.scoreInfo?.score ?? 0) - (a.scoreInfo?.score ?? 0));
                this.logFeedInfo(logPrefix);
                // TODO: Saving to local storage here amounts to kind of an unexpected side effect
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
        let msg = [
            `Got ${toots.length} new toots from ${Object.keys(this.followedAccounts).length} followed accts`,
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