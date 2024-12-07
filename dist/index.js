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
exports.TheAlgorithm = exports.SourceFilterName = exports.PropertyFilter = exports.NumericFilter = exports.PropertyName = exports.TIME_DECAY = void 0;
const async_mutex_1 = require("async-mutex");
const chaosFeatureScorer_1 = __importDefault(require("./scorer/feature/chaosFeatureScorer"));
const diversity_feed_scorer_1 = __importDefault(require("./scorer/feed/diversity_feed_scorer"));
const followed_tags_feature_scorer_1 = __importDefault(require("./scorer/feature/followed_tags_feature_scorer"));
const homeFeed_1 = __importDefault(require("./feeds/homeFeed"));
const trending_tags_1 = __importDefault(require("./feeds/trending_tags"));
const trending_toots_1 = __importDefault(require("./feeds/trending_toots"));
const ImageAttachmentScorer_1 = __importDefault(require("./scorer/feature/ImageAttachmentScorer"));
const InteractionsFeatureScorer_1 = __importDefault(require("./scorer/feature/InteractionsFeatureScorer"));
const mastodon_api_cache_1 = __importDefault(require("./api/mastodon_api_cache"));
const most_favorited_accounts_scorer_1 = __importDefault(require("./scorer/feature/most_favorited_accounts_scorer"));
const most_replied_accounts_scorer_1 = __importDefault(require("./scorer/feature/most_replied_accounts_scorer"));
const numeric_filter_1 = __importDefault(require("./objects/numeric_filter"));
exports.NumericFilter = numeric_filter_1.default;
const num_favorites_scorer_1 = __importDefault(require("./scorer/feature/num_favorites_scorer"));
const num_replies_scorer_1 = __importDefault(require("./scorer/feature/num_replies_scorer"));
const num_retoots_scorer_1 = __importDefault(require("./scorer/feature/num_retoots_scorer"));
const paginator_1 = __importDefault(require("./api/paginator"));
const property_filter_1 = __importStar(require("./objects/property_filter"));
exports.PropertyFilter = property_filter_1.default;
Object.defineProperty(exports, "PropertyName", { enumerable: true, get: function () { return property_filter_1.PropertyName; } });
Object.defineProperty(exports, "SourceFilterName", { enumerable: true, get: function () { return property_filter_1.SourceFilterName; } });
const retooted_users_scorer_1 = __importDefault(require("./scorer/feature/retooted_users_scorer"));
const retoots_in_feed_scorer_1 = __importDefault(require("./scorer/feed/retoots_in_feed_scorer"));
const Storage_1 = __importDefault(require("./Storage"));
const trending_tags_scorer_1 = __importDefault(require("./scorer/feature/trending_tags_scorer"));
const trending_toots_feature_scorer_1 = __importDefault(require("./scorer/feature/trending_toots_feature_scorer"));
const VideoAttachmentScorer_1 = __importDefault(require("./scorer/feature/VideoAttachmentScorer"));
const account_1 = require("./objects/account");
const toot_1 = require("./objects/toot");
const config_1 = require("./config");
const helpers_1 = require("./helpers");
const types_1 = require("./types");
const TIME_DECAY = types_1.WeightName.TIME_DECAY;
exports.TIME_DECAY = TIME_DECAY;
const BROKEN_TAG = "<<BROKEN_TAG>>";
const UNKNOWN_APP = "unknown";
class TheAlgorithm {
    api;
    user;
    filters;
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
        new chaosFeatureScorer_1.default(),
        new most_favorited_accounts_scorer_1.default(),
        new followed_tags_feature_scorer_1.default(),
        new ImageAttachmentScorer_1.default(),
        new InteractionsFeatureScorer_1.default(),
        new num_favorites_scorer_1.default(),
        new num_replies_scorer_1.default(),
        new num_retoots_scorer_1.default(),
        new retooted_users_scorer_1.default(),
        new most_replied_accounts_scorer_1.default(),
        new trending_toots_feature_scorer_1.default(),
        new trending_tags_scorer_1.default(),
        new VideoAttachmentScorer_1.default(),
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
        // algo.serverSideFilters = await Storage.getServerSideFilters();
        algo.repairFeedAndExtractSummaryInfo();
        algo.setFeedInApp(algo.feed);
        return algo;
    }
    constructor(params) {
        this.api = params.api;
        this.user = params.user;
        this.setFeedInApp = params.setFeedInApp ?? this.setFeedInApp;
        this.filters = JSON.parse(JSON.stringify(config_1.DEFAULT_FILTERS));
        // this.serverSidePropertyFilter = new PropertyFilter({title: "Server-side filters"});
        this.reloadIfOlderThanMS = Storage_1.default.getConfig().reloadIfOlderThanMinutes * 60 * 1000; // Currently unused
    }
    // Fetch toots from followed accounts plus trending toots in the fediverse, then score and sort them
    async getFeed(numTimelineToots = null, maxId = null) {
        console.debug(`[fedialgo] getFeed() called (numTimelineToots=${numTimelineToots}, maxId=${maxId})`);
        numTimelineToots = numTimelineToots || Storage_1.default.getConfig().numTootsInFirstFetch;
        let allResponses = [];
        if (!maxId) {
            // Fetch toots and prepare scorer data (only needs to be done once, not on incremental fetches)
            allResponses = await Promise.all([
                mastodon_api_cache_1.default.getFollowedAccounts(this.api),
                mastodon_api_cache_1.default.getServerSideFilters(this.api),
                (0, homeFeed_1.default)(this.api, numTimelineToots),
                (0, trending_toots_1.default)(this.api),
                (0, trending_tags_1.default)(this.api),
                // featureScorers return [] (they're here as a parallelization hack)
                ...this.featureScorers.map(scorer => scorer.getFeature(this.api)),
            ]);
            this.followedAccounts = allResponses.shift();
            this.serverSideFilters = allResponses.shift();
            console.log(`getFeed() got ${this.serverSideFilters.length} server-side filters:`, this.serverSideFilters);
        }
        else {
            // incremental fetch (should be done in background after delivering first timeline toots)
            allResponses = await Promise.all([(0, homeFeed_1.default)(this.api, numTimelineToots, maxId)]);
        }
        let newHomeToots = allResponses[0];
        let newToots = allResponses.flat();
        this.logTootCounts(newToots, newHomeToots);
        // Remove replies, stuff already retooted, invalid future timestamps, nulls, etc.
        let cleanFeed = newToots.filter((toot) => this.isValidForFeed.bind(this)(toot));
        const numRemoved = newToots.length - cleanFeed.length;
        console.log(`Removed ${numRemoved} invalid toots of ${newToots.length} leaving ${cleanFeed.length}`);
        cleanFeed = (0, helpers_1.dedupeToots)([...this.feed, ...cleanFeed], "getFeed");
        this.feed = cleanFeed.slice(0, Storage_1.default.getConfig().maxNumCachedToots);
        this.followedTags = await mastodon_api_cache_1.default.getFollowedTags(this.api); // Should be cached already; we're just pulling it into this class
        this.repairFeedAndExtractSummaryInfo();
        this.maybeGetMoreToots(newHomeToots, numTimelineToots);
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
    //   - Set toot.language to defaultLanguage if missing
    //   - Set media type to "image" if unknown and reparable
    repairFeedAndExtractSummaryInfo() {
        const appCounts = {};
        const languageCounts = {};
        const sourceCounts = {};
        const tagCounts = {};
        const userCounts = {};
        const serverSideFilterCounts = {};
        this.feed.forEach(toot => {
            // Decorate / repair toot data
            toot.application ??= { name: UNKNOWN_APP };
            toot.application.name ??= UNKNOWN_APP;
            toot.language ??= Storage_1.default.getConfig().defaultLanguage;
            toot.isFollowed = toot.account.acct in this.followedAccounts;
            // Check for weird media types
            toot.mediaAttachments.forEach((media) => {
                if (media.type === "unknown" && (0, helpers_1.isImage)(media.remoteUrl)) {
                    console.warn(`Repairing broken media attachment in toot:`, toot);
                    media.type = helpers_1.IMAGE;
                }
                else if (!helpers_1.MEDIA_TYPES.includes(media.type)) {
                    console.warn(`Unknown media type: '${media.type}' for toot:`, toot);
                }
            });
            // Lowercase and count tags
            toot.tags.forEach(tag => {
                tag.name = (tag.name?.length > 0) ? tag.name.toLowerCase() : BROKEN_TAG;
                tagCounts[tag.name] = (tagCounts[tag.name] || 0) + 1;
            });
            // Must happen after tags are lowercased and before source counts are aggregated
            toot.followedTags = toot.tags.filter((tag) => tag.name in this.followedTags);
            languageCounts[toot.language] = (languageCounts[toot.language] || 0) + 1;
            appCounts[toot.application.name] = (appCounts[toot.application.name] || 0) + 1;
            userCounts[toot.account.acct] = (userCounts[toot.account.acct] || 0) + 1;
            // Aggregate source counts
            Object.entries(property_filter_1.SOURCE_FILTERS).forEach(([sourceName, sourceFilter]) => {
                if (sourceFilter(toot)) {
                    sourceCounts[sourceName] ??= 0;
                    sourceCounts[sourceName] += 1;
                }
            });
            // Aggregate server-side filter counts
            this.serverSideFilters.forEach((filter) => {
                // before 4.0 Filter objects lacked a 'context' property
                if (filter.context?.length > 0 && !filter.context.includes("home"))
                    return;
                if (filter.filterAction != "hide")
                    return;
                filter.keywords.forEach((keyword) => {
                    if ((0, toot_1.containsString)(toot, keyword.keyword)) {
                        console.debug(`toot ${(0, toot_1.describeToot)(toot)} matched server side filter keyword:`, keyword);
                        serverSideFilterCounts[keyword.keyword] ??= 0;
                        serverSideFilterCounts[keyword.keyword] += 1;
                    }
                });
            });
        });
        // Instantiate missing filter sections  // TODO: maybe this should happen in Storage?
        Object.values(property_filter_1.PropertyName).forEach((sectionName) => {
            if (sectionName in this.filters.filterSections)
                return;
            this.filters.filterSections[sectionName] = new property_filter_1.default({ title: sectionName });
        });
        // TODO: if there's an validValue set for a filter section that is no longer in the feed
        // the user will not be presented with the option to turn it off. This is a bug.
        this.filters.filterSections[property_filter_1.PropertyName.APP].optionInfo = appCounts;
        this.filters.filterSections[property_filter_1.PropertyName.HASHTAG].optionInfo = tagCounts;
        this.filters.filterSections[property_filter_1.PropertyName.LANGUAGE].optionInfo = languageCounts;
        this.filters.filterSections[property_filter_1.PropertyName.SOURCE].optionInfo = sourceCounts;
        this.filters.filterSections[property_filter_1.PropertyName.USER].optionInfo = userCounts;
        // Server side filters are inverted by default bc we don't want to show toots including them
        this.filters.filterSections[property_filter_1.PropertyName.SERVER_SIDE_FILTERS].optionInfo = serverSideFilterCounts;
        this.filters.filterSections[property_filter_1.PropertyName.SERVER_SIDE_FILTERS].validValues = Object.keys(serverSideFilterCounts);
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
            && newHomeToots.length >= (numTimelineToots - 2)) {
            setTimeout(() => {
                // Use the 5th toot bc sometimes there are weird outliers. Dupes will be removed later.
                console.log(`calling getFeed() recursively current newHomeToots:`, newHomeToots);
                const tootWithMaxId = (0, toot_1.sortByCreatedAt)(newHomeToots)[5];
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
                console.log(`halting getFeed(): last fetch only got ${newHomeToots.length} toots (expected ${numTimelineToots})`);
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
                    await this.decorateWithScoreInfo(toot);
                }
                // Sort feed based on score from high to low.
                this.feed.sort((a, b) => (b.scoreInfo?.score ?? 0) - (a.scoreInfo?.score ?? 0));
                this.logFeedInfo(logPrefix);
                Storage_1.default.setFeed(this.feed);
                console.debug(`${logPrefix} call completed successfully...`);
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
    // Add scores including weighted & unweighted components to the Toot for debugging/inspection
    async decorateWithScoreInfo(toot) {
        // console.debug(`decorateWithScoreInfo ${describeToot(toot)}: `, toot);
        let rawScore = 1;
        const rawScores = {};
        const weightedScores = {};
        const userWeights = await this.getUserWeights();
        const scores = await Promise.all(this.weightedScorers.map(scorer => scorer.score(toot)));
        // Compute a weighted score a toot based by multiplying the value of each numerical property
        // by the user's chosen weighting for that property (the one configured with the GUI sliders).
        this.weightedScorers.forEach((scorer, i) => {
            const scoreValue = scores[i] || 0;
            rawScores[scorer.name] = scoreValue;
            weightedScores[scorer.name] = scoreValue * (userWeights[scorer.name] ?? 0);
            rawScore += weightedScores[scorer.name];
        });
        // Trending toots usually have a lot of reblogs, likes, replies, etc. so they get disproportionately
        // high scores. To fix this we hack a final adjustment to the score by multiplying by the
        // trending toot weighting if the weighting is less than 1.0.
        const trendingScore = rawScores[types_1.WeightName.TRENDING_TOOTS] ?? 0;
        const trendingWeighting = userWeights[types_1.WeightName.TRENDING_TOOTS] ?? 0;
        if (trendingScore > 0 && trendingWeighting < 1.0)
            rawScore *= trendingWeighting;
        // Multiple rawScore by time decay penalty to get a final value
        const timeDecay = userWeights[TIME_DECAY] || config_1.DEFAULT_WEIGHTS[TIME_DECAY].defaultWeight;
        const seconds = Math.floor((new Date().getTime() - new Date(toot.createdAt).getTime()) / 1000);
        const timeDecayMultiplier = Math.pow((1 + timeDecay), -1 * Math.pow((seconds / 3600), 2));
        const score = rawScore * timeDecayMultiplier;
        toot.scoreInfo = {
            rawScore,
            rawScores,
            score,
            timeDecayMultiplier,
            weightedScores,
        };
        // If it's a retoot copy the scores to the retooted toot as well // TODO: this is janky
        if (toot.reblog)
            toot.reblog.scoreInfo = toot.scoreInfo;
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
        if (Date.now() < (new Date(toot.createdAt)).getTime()) {
            console.warn(`Removed toot with future timestamp: `, toot);
            return false;
        }
        // The user can configure suppression filters through a Mastodon GUI (webapp or whatever)
        if (toot.filtered && toot.filtered.length > 0) {
            const filterMatch = toot.filtered[0];
            console.debug(`Removed toot matching filter (${filterMatch.keywordMatches?.join(' ')}): `, toot);
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