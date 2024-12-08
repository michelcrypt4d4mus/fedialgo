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
exports.videoAttachments = exports.TheAlgorithm = exports.SourceFilterName = exports.PropertyName = exports.PropertyFilter = exports.NumericFilter = exports.imageAttachments = exports.describeAccount = exports.TIME_DECAY = void 0;
/*
 * Main class that handles scoring and sorting a feed made of Toot objects.
 */
const async_mutex_1 = require("async-mutex");
const chaos_scorer_1 = __importDefault(require("./scorer/feature/chaos_scorer"));
const diversity_feed_scorer_1 = __importDefault(require("./scorer/feed/diversity_feed_scorer"));
const followed_tags_feature_scorer_1 = __importDefault(require("./scorer/feature/followed_tags_feature_scorer"));
const image_attachment_scorer_1 = __importDefault(require("./scorer/feature/image_attachment_scorer"));
const interactions_scorer_1 = __importDefault(require("./scorer/feature/interactions_scorer"));
const most_favorited_accounts_scorer_1 = __importDefault(require("./scorer/feature/most_favorited_accounts_scorer"));
const most_replied_accounts_scorer_1 = __importDefault(require("./scorer/feature/most_replied_accounts_scorer"));
const numeric_filter_1 = __importDefault(require("./filters/numeric_filter"));
exports.NumericFilter = numeric_filter_1.default;
const num_favorites_scorer_1 = __importDefault(require("./scorer/feature/num_favorites_scorer"));
const num_replies_scorer_1 = __importDefault(require("./scorer/feature/num_replies_scorer"));
const num_retoots_scorer_1 = __importDefault(require("./scorer/feature/num_retoots_scorer"));
const paginator_1 = __importDefault(require("./api/paginator"));
const property_filter_1 = __importStar(require("./filters/property_filter"));
exports.PropertyFilter = property_filter_1.default;
Object.defineProperty(exports, "PropertyName", { enumerable: true, get: function () { return property_filter_1.PropertyName; } });
Object.defineProperty(exports, "SourceFilterName", { enumerable: true, get: function () { return property_filter_1.SourceFilterName; } });
const retooted_users_scorer_1 = __importDefault(require("./scorer/feature/retooted_users_scorer"));
const retoots_in_feed_scorer_1 = __importDefault(require("./scorer/feed/retoots_in_feed_scorer"));
const scorer_1 = __importDefault(require("./scorer/scorer"));
const Storage_1 = __importDefault(require("./Storage"));
const trending_tags_scorer_1 = __importDefault(require("./scorer/feature/trending_tags_scorer"));
const trending_toots_scorer_1 = __importDefault(require("./scorer/feature/trending_toots_scorer"));
const video_attachment_scorer_1 = __importDefault(require("./scorer/feature/video_attachment_scorer"));
const account_1 = require("./api/objects/account");
const helpers_1 = require("./helpers");
const config_1 = require("./config");
const api_1 = require("./api/api");
const types_1 = require("./types");
const toot_1 = require("./api/objects/toot");
Object.defineProperty(exports, "describeAccount", { enumerable: true, get: function () { return toot_1.describeAccount; } });
Object.defineProperty(exports, "imageAttachments", { enumerable: true, get: function () { return toot_1.imageAttachments; } });
Object.defineProperty(exports, "videoAttachments", { enumerable: true, get: function () { return toot_1.videoAttachments; } });
const TIME_DECAY = types_1.WeightName.TIME_DECAY;
exports.TIME_DECAY = TIME_DECAY;
class TheAlgorithm {
    api;
    user;
    filters;
    mastoApi;
    // Variables with initial values
    feed = [];
    serverSideFilters = [];
    followedAccounts = {};
    followedTags = {};
    scoreMutex = new async_mutex_1.Mutex();
    reloadIfOlderThanMS;
    // Optional callback to set the feed in the code using this package
    setFeedInApp = (f) => console.debug(`Default setFeedInApp() called...`);
    // These can score a toot without knowing about the rest of the toots in the feed
    featureScorers = [
        new chaos_scorer_1.default(),
        new most_favorited_accounts_scorer_1.default(),
        new followed_tags_feature_scorer_1.default(),
        new image_attachment_scorer_1.default(),
        new interactions_scorer_1.default(),
        new num_favorites_scorer_1.default(),
        new num_replies_scorer_1.default(),
        new num_retoots_scorer_1.default(),
        new retooted_users_scorer_1.default(),
        new most_replied_accounts_scorer_1.default(),
        new trending_toots_scorer_1.default(),
        new trending_tags_scorer_1.default(),
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
    // TimeDecay requires bespoke handling so it's not included in the loop above
    { [TIME_DECAY]: Object.assign({}, config_1.DEFAULT_WEIGHTS[TIME_DECAY]) });
    // This is the alternate constructor() that instantiates the class and loads the feed from storage.
    static async create(params) {
        await Storage_1.default.setIdentity(params.user);
        await Storage_1.default.logAppOpen();
        const algo = new TheAlgorithm(params);
        await algo.setDefaultWeights();
        algo.filters = await Storage_1.default.getFilters();
        algo.feed = await Storage_1.default.getFeed();
        algo.followedAccounts = (0, account_1.buildAccountNames)((await Storage_1.default.getFollowedAccts()));
        algo.repairFeedAndExtractSummaryInfo();
        algo.setFeedInApp(algo.feed);
        return algo;
    }
    constructor(params) {
        this.api = params.api;
        this.mastoApi = new api_1.MastoApi(this.api);
        this.user = params.user;
        this.setFeedInApp = params.setFeedInApp ?? this.setFeedInApp;
        this.filters = JSON.parse(JSON.stringify(config_1.DEFAULT_FILTERS));
        this.reloadIfOlderThanMS = Storage_1.default.getConfig().reloadIfOlderThanMinutes * 60 * 1000; // Currently unused
    }
    // Fetch toots from followed accounts plus trending toots in the fediverse, then score and sort them
    async getFeed(numTimelineToots, maxId) {
        console.debug(`[fedialgo] getFeed() called (numTimelineToots=${numTimelineToots}, maxId=${maxId})`);
        numTimelineToots = numTimelineToots || Storage_1.default.getConfig().numTootsInFirstFetch;
        let promises = [this.mastoApi.getFeed(numTimelineToots, maxId)];
        // If this is the first call to getFeed(), also fetch the user's followed accounts and tags
        if (!maxId) {
            promises = promises.concat([
                this.mastoApi.getStartupData(),
                // FeatureScorers return empty arrays; they're just here for load time parallelism
                ...this.featureScorers.map(scorer => scorer.getFeature(this.api)),
            ]);
        }
        const allResponses = await Promise.all(promises);
        console.log(`getFeed() allResponses:`, allResponses);
        const { homeToots, otherToots } = allResponses.shift();
        const newToots = [...homeToots, ...otherToots];
        console.log(`getFeed() got ${homeToots.length} newToots, ${otherToots.length} other toots`);
        if (allResponses.length > 0) {
            const userData = allResponses.shift();
            this.followedAccounts = userData.followedAccounts;
            this.followedTags = userData.followedTags;
            this.serverSideFilters = userData.serverSideFilters;
        }
        this.logTootCounts(newToots, homeToots);
        // Remove replies, stuff already retooted, invalid future timestamps, nulls, etc.
        let cleanNewToots = newToots.filter((toot) => this.isValidForFeed.bind(this)(toot));
        const numRemoved = newToots.length - cleanNewToots.length;
        console.log(`Removed ${numRemoved} invalid toots of ${newToots.length} leaving ${cleanNewToots.length}`);
        const cleanFeed = (0, helpers_1.dedupeToots)([...this.feed, ...cleanNewToots], "getFeed");
        this.feed = cleanFeed.slice(0, Storage_1.default.getConfig().maxNumCachedToots);
        this.repairFeedAndExtractSummaryInfo();
        this.maybeGetMoreToots(homeToots, numTimelineToots);
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
        return this.filteredFeed();
    }
    // Filter the feed based on the user's settings. Has the side effect of calling the setFeedInApp() callback.
    filteredFeed() {
        const filteredFeed = this.feed.filter(toot => this.isInTimeline(toot));
        console.log(`filteredFeed() found ${filteredFeed.length} valid toots of ${this.feed.length}...`);
        this.setFeedInApp(filteredFeed);
        return filteredFeed;
    }
    // Debugging method to log info about the timeline toots
    logFeedInfo(prefix = "") {
        prefix = prefix.length == 0 ? prefix : `${prefix} `;
        console.log(`${prefix}timeline toots (condensed):`, this.feed.map(toot_1.condensedStatus));
        console.log(`${prefix}timeline toots filters, including counts:`, this.filters);
    }
    // Compute language and application counts. Repair broken toots and populate extra data:
    //   - Set isFollowed flag
    repairFeedAndExtractSummaryInfo() {
        const tootCounts = Object.values(property_filter_1.PropertyName).reduce((counts, propertyName) => {
            // Instantiate missing filter sections  // TODO: maybe this should happen in Storage?
            this.filters.filterSections[propertyName] ??= new property_filter_1.default({ title: propertyName });
            counts[propertyName] = {};
            return counts;
        }, {});
        this.feed.forEach(toot => {
            (0, toot_1.repairToot)(toot);
            toot.isFollowed = toot.account.acct in this.followedAccounts;
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
            // Aggregate source counts
            Object.entries(property_filter_1.SOURCE_FILTERS).forEach(([sourceName, sourceFilter]) => {
                if (sourceFilter(toot)) {
                    (0, helpers_1.incrementCount)(tootCounts[property_filter_1.PropertyName.SOURCE], sourceName);
                }
            });
            // Aggregate server-side filter counts
            this.serverSideFilters.forEach((filter) => {
                filter.keywords.forEach((keyword) => {
                    if ((0, toot_1.containsString)(toot, keyword.keyword)) {
                        console.debug(`toot ${(0, toot_1.describeToot)(toot)} matched server filter:`, filter);
                        (0, helpers_1.incrementCount)(tootCounts[property_filter_1.PropertyName.SERVER_SIDE_FILTERS], keyword.keyword);
                    }
                });
            });
        });
        // TODO: if there's an validValue set for a filter section that is no longer in the feed
        // the user will not be presented with the option to turn it off. This is a bug.
        Object.entries(tootCounts).forEach(([propertyName, counts]) => {
            this.filters.filterSections[propertyName].setOptions(counts);
        });
        console.debug(`repairFeedAndExtractSummaryInfo() completed, built filters:`, this.filters);
    }
    // TODO: is this ever used?
    list() {
        return new paginator_1.default(this.feed);
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
                const tootWithMaxId = (0, toot_1.sortByCreatedAt)(newHomeToots)[5];
                console.log(`calling getFeed() recursively current newHomeToots:`, newHomeToots);
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
                await Promise.all(this.feedScorers.map(scorer => scorer.setFeed(this.feed)));
                // TODO: DiversityFeedScorer mutations are problematic when used with Promise.all() so use a loop
                for (const toot of this.feed) {
                    await scorer_1.default.decorateWithScoreInfo(toot, this.weightedScorers);
                }
                // Sort feed based on score from high to low.
                this.feed.sort((a, b) => (b.scoreInfo?.score ?? 0) - (a.scoreInfo?.score ?? 0));
                this.logFeedInfo(logPrefix);
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
        return this.filteredFeed();
    }
    // Return true if the toot has not been filtered out of the feed
    isInTimeline(toot) {
        let isOK = Object.values(this.filters.filterSections).every((section) => section.isAllowed(toot));
        return isOK && Object.values(this.filters.numericFilters).every((filter) => filter.isAllowed(toot));
    }
    // Return false if Toot should be discarded from feed altogether and permanently
    isValidForFeed(toot) {
        if (toot == undefined)
            return false;
        if (toot?.reblog?.muted || toot?.muted)
            return false; // Remove muted accounts and toots
        // Remove things the user has already retooted
        if (toot?.reblog?.reblogged) {
            return false;
        }
        // Remove the user's own toots
        if (toot.account.username == this.user.username && toot.account.id == this.user.id) {
            return false;
        }
        // Sometimes there are wonky statuses that are like years in the future so we filter them out.
        if (Date.now() < new Date(toot.createdAt).getTime()) {
            console.warn(`Removed toot with future timestamp: `, toot);
            return false;
        }
        // The user can configure suppression filters through a Mastodon GUI (webapp or whatever)
        if (toot.filtered?.length) {
            const filterMatch = toot.filtered[0];
            console.debug(`Removed toot matching server filter (${filterMatch.keywordMatches?.join(' ')}): `, toot);
            return false;
        }
        return true;
    }
    ;
    // Utility method to log progress of getFeed() calls
    logTootCounts(newToots, newHomeToots) {
        let msg = `Got ${Object.keys(this.followedAccounts).length} followed accounts, ${newToots.length} new toots`;
        msg += `, ${newHomeToots.length} new home toots, ${newToots.length} total new toots, this.feed has ${this.feed.length} toots`;
        console.log(msg);
    }
    shouldReloadFeed() {
        const mostRecentTootAt = (0, toot_1.earliestTootAt)(this.feed);
        if (!mostRecentTootAt)
            return true;
        return ((Date.now() - mostRecentTootAt.getTime()) > this.reloadIfOlderThanMS);
    }
    // Adjust toot weights based on user's chosen slider values
    // TODO: unclear whether this is working correctly
    async learnWeights(tootScores, step = 0.001) {
        console.debug(`learnWeights() called with 'tootScores' arg but is not implemented`, tootScores);
        return;
        // if (!this.filters.weightLearningEnabled) {
        if (true) {
            console.debug(`learnWeights() called but weight learning is disabled...`);
            return;
        }
        else if (!tootScores) {
            console.debug(`learnWeights() called but tootScores arg is empty...`);
            return;
        }
        // Compute the total and mean score (AKA 'weight') of all the posts we are weighting
        const total = Object.values(tootScores)
            .filter((value) => !isNaN(value))
            .reduce((accumulator, currentValue) => accumulator + Math.abs(currentValue), 0);
        const mean = total / Object.values(tootScores).length;
        // Compute the sum and mean of the preferred weighting configured by the user with the weight sliders
        const newTootScores = await this.getUserWeights();
        const userWeightTotal = Object.values(newTootScores)
            .filter((value) => !isNaN(value))
            .reduce((accumulator, currentValue) => accumulator + currentValue, 0);
        const meanUserWeight = userWeightTotal / Object.values(newTootScores).length;
        for (let key in newTootScores) {
            const reweight = 1 - (Math.abs(tootScores[key]) / mean) / (newTootScores[key] / meanUserWeight);
            newTootScores[key] = newTootScores[key] - (step * newTootScores[key] * reweight); // TODO: this seems wrong?
        }
        await this.updateUserWeights(newTootScores);
        return newTootScores;
    }
}
exports.TheAlgorithm = TheAlgorithm;
;
//# sourceMappingURL=index.js.map