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
exports.TheAlgorithm = exports.TIME_DECAY = void 0;
const async_mutex_1 = require("async-mutex");
const homeFeed_1 = __importDefault(require("./feeds/homeFeed"));
const Paginator_1 = __importDefault(require("./Paginator"));
const Storage_1 = __importStar(require("./Storage"));
const trending_toots_1 = __importDefault(require("./feeds/trending_toots"));
const scorer_1 = require("./scorer");
const helpers_1 = require("./helpers");
const topPostFeatureScorer_1 = require("./scorer/feature/topPostFeatureScorer");
//import getRecommenderFeed from "./feeds/recommenderFeed";
const ENGLISH_CODE = 'en';
const UNKNOWN_APP = "unknown";
const EARLIEST_TIMESTAMP = new Date("1970-01-01T00:00:00.000Z");
const RELOAD_IF_OLDER_THAN_MINUTES = 0.5;
const RELOAD_IF_OLDER_THAN_MS = RELOAD_IF_OLDER_THAN_MINUTES * 60 * 1000;
const TIME_DECAY = 'TimeDecay';
exports.TIME_DECAY = TIME_DECAY;
const TIME_DECAY_DEFAULT = 0.05;
// Time Decay works differently from the rest so this is a ScorerInfo object w/out the Scorer
const TIME_DECAY_INFO = {
    defaultWeight: TIME_DECAY_DEFAULT,
    description: "Higher values means toots are demoted sooner",
};
class TheAlgorithm {
    api;
    user;
    filters;
    feed = [];
    feedLanguageCounts = {};
    appCounts = {};
    scoreMutex = new async_mutex_1.Mutex();
    // Optional callback to set the feed in the code using this package
    setFeedInApp = (f) => console.log(`Default setFeedInApp() called...`);
    fetchers = [
        homeFeed_1.default,
        trending_toots_1.default
    ];
    // These can score a toot without knowing about the rest of the toots in the feed
    featureScorers = [
        new scorer_1.ChaosFeatureScorer(),
        new scorer_1.FavsFeatureScorer(),
        new scorer_1.FollowedTagsFeatureScorer(),
        new scorer_1.ImageAttachmentScorer(),
        new scorer_1.InteractionsFeatureScorer(),
        new scorer_1.NumFavoritesScorer(),
        new scorer_1.NumRepliesScorer(),
        new scorer_1.ReblogsFeatureScorer(),
        new scorer_1.RepliedFeatureScorer(),
        new scorer_1.TopPostFeatureScorer(),
        new scorer_1.VideoAttachmentScorer(),
    ];
    // These scorers require the complete feed to work properly
    feedScorers = [
        new scorer_1.DiversityFeedScorer(),
        new scorer_1.ReblogsFeedScorer(),
    ];
    weightedScorers = [
        ...this.featureScorers,
        ...this.feedScorers,
    ];
    scorersDict = this.weightedScorers.reduce((scorerInfos, scorer) => {
        scorerInfos[scorer.name] = scorer.getInfo();
        return scorerInfos;
    }, { [TIME_DECAY]: Object.assign({}, TIME_DECAY_INFO) });
    // This is the alternate constructor() that instantiates the class and loads the feed from storage.
    static async create(params) {
        await Storage_1.default.setIdentity(params.user);
        await Storage_1.default.logAppOpen();
        const algo = new TheAlgorithm(params);
        await algo.setDefaultWeights();
        algo.filters = await Storage_1.default.getFilters();
        algo.feed = await Storage_1.default.getFeed();
        algo.setFeedInApp(algo.feed);
        return algo;
    }
    constructor(params) {
        this.api = params.api;
        this.user = params.user;
        this.setFeedInApp = params.setFeedInApp ?? this.setFeedInApp;
        this.filters = JSON.parse(JSON.stringify(Storage_1.DEFAULT_FILTERS));
    }
    // Fetch toots from followed accounts plus trending toots in the fediverse, then score and sort them
    async getFeed() {
        console.debug(`getFeed() called in fedialgo package...`);
        // Fetch toots and prepare scorers before scoring (only needs to be done once (???))
        const allResponses = await Promise.all([
            ...this.fetchers.map(fetcher => fetcher(this.api)),
            ...this.featureScorers.map(scorer => scorer.getFeature(this.api)),
        ]);
        this.feed = allResponses.flat();
        console.log(`Found ${this.feed.length} potential toots for feed. allResponses:`, allResponses);
        // Remove replies, stuff already retooted, invalid future timestamps, nulls, etc.
        let cleanFeed = this.feed.filter((toot) => this.isValidForFeed.bind(this)(toot));
        const numRemoved = this.feed.length - cleanFeed.length;
        console.log(`Removed ${numRemoved} invalid toots (of ${this.feed.length}) leaving ${cleanFeed.length}`);
        // Compute average trendingRank and remove dupes by uniquifying on the URI
        scorer_1.TopPostFeatureScorer.setTrendingRankToAvg(cleanFeed);
        const numValid = cleanFeed.length;
        cleanFeed = [...new Map(cleanFeed.map((toot) => [toot.uri, toot])).values()];
        console.log(`Removed ${numValid - cleanFeed.length} duplicate toots leaving ${cleanFeed.length}`);
        this.feed = cleanFeed;
        this.extractSummaryInfo();
        return this.scoreFeed.bind(this)();
    }
    // Update user weightings and rescore / resort the feed.
    async updateUserWeights(userWeights) {
        console.log("updateUserWeights() called with weights:", userWeights);
        await Storage_1.default.setWeightings(userWeights);
        return this.scoreFeed.bind(this)();
    }
    async updateFilters(newFilters) {
        console.log(`updateFilters() called with newFilters: `, newFilters);
        this.filters = newFilters;
        Storage_1.default.setFilters(newFilters);
        return this.filteredFeed();
    }
    ;
    // Return the user's current weightings for each score category
    async getUserWeights() {
        return await Storage_1.default.getWeightings();
    }
    // Filter the feed based on the user's settings. Has the side effect of calling the setFeedInApp() callback.
    filteredFeed() {
        const filteredFeed = this.feed.filter(toot => this.isFiltered(toot));
        this.setFeedInApp(filteredFeed);
        return filteredFeed;
    }
    // Find the most recent toot in the feed
    mostRecentTootAt() {
        if (this.feed.length == 0)
            return EARLIEST_TIMESTAMP;
        const mostRecentToot = this.feed.reduce((recentest, toot) => recentest.createdAt > toot.createdAt ? recentest : toot, this.feed[0]);
        return new Date(mostRecentToot.createdAt);
    }
    ;
    // Debugging method to log info about the timeline toots
    logFeedInfo(prefix = "") {
        prefix = prefix.length == 0 ? prefix : `${prefix} `;
        console.debug(`${prefix} feed toots posted by application counts:`, this.appCounts);
        console.log(`${prefix} timeline toots (condensed):`, this.feed.map(helpers_1.condensedStatus));
    }
    // Adjust toot weights based on user's chosen slider values
    // TODO: unclear whether this is working correctly
    async learnWeights(tootScores, step = 0.001) {
        console.debug(`learnWeights() called with 'tootScores' arg: `, tootScores);
        if (!this.filters.weightLearningEnabled) {
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
        for (const key in newTootScores) {
            const reweight = 1 - (Math.abs(tootScores[key]) / mean) / (newTootScores[key] / meanUserWeight);
            newTootScores[key] = newTootScores[key] - (step * newTootScores[key] * reweight); // TODO: this seems wrong?
        }
        await this.updateUserWeights(newTootScores);
        return newTootScores;
    }
    // TODO: is this ever used?
    list() {
        return new Paginator_1.default(this.feed);
    }
    // Load weightings from storage. Set defaults for any missing weightings.
    async setDefaultWeights() {
        let weightings = await Storage_1.default.getWeightings();
        let shouldSetWeights = false;
        Object.keys(this.scorersDict).forEach(key => {
            if (!weightings[key] && weightings[key] !== 0) {
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
        const trendingScore = rawScores[topPostFeatureScorer_1.TRENDING_TOOTS] ?? 0;
        const trendingWeighting = userWeights[topPostFeatureScorer_1.TRENDING_TOOTS] ?? 0;
        if (trendingScore > 0 && trendingWeighting < 1.0)
            rawScore *= trendingWeighting;
        // Multiple rawScore by time decay penalty to get a final value
        const timeDecay = userWeights[TIME_DECAY] || TIME_DECAY_DEFAULT;
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
    // Compute language and application counts. Set toot.language to Enlgish if missing.
    extractSummaryInfo() {
        this.feedLanguageCounts = this.feed.reduce((langCounts, toot) => {
            toot.language ??= ENGLISH_CODE; // Default to English
            langCounts[toot.language] = (langCounts[toot.language] || 0) + 1;
            return langCounts;
        }, {});
        this.appCounts = this.feed.reduce((counts, toot) => {
            const app = toot.application?.name || UNKNOWN_APP;
            counts[app] = (counts[app] || 0) + 1;
            return counts;
        }, {});
    }
    isFiltered(toot) {
        const languages = this.filters.filteredLanguages;
        const tootLanguage = toot.language || ENGLISH_CODE;
        if (languages.length > 0) {
            if (!languages.includes(tootLanguage)) {
                console.debug(`Removing toot ${toot.uri} w/invalid language ${tootLanguage}. valid langs:`, languages);
                return false;
            }
            else {
                console.debug(`Allowing toot with language ${tootLanguage}...`);
            }
        }
        if (this.filters.onlyLinks && !(toot.card || toot.reblog?.card)) {
            return false;
        }
        else if (toot.reblog && !this.filters.includeReposts) {
            console.debug(`Removing reblogged toot from feed`, toot);
            return false;
        }
        else if (!this.filters.includeTrendingToots && toot.scoreInfo?.rawScores[topPostFeatureScorer_1.TRENDING_TOOTS]) {
            return false;
        }
        else if (!this.filters.includeFollowedAccounts && !toot.scoreInfo?.rawScores[topPostFeatureScorer_1.TRENDING_TOOTS]) {
            return false;
        }
        else if (!this.filters.includeReplies && toot.inReplyToId) {
            return false;
        }
        else if (!this.filters.includeFollowedHashtags && toot.followedTags?.length) {
            return false;
        }
        return true;
    }
    isValidForFeed(toot) {
        if (toot == undefined)
            return false;
        if (toot?.reblog?.muted || toot?.muted)
            return false; // Remove muted accounts and toots
        // Remove retoots (i guess things user has already retooted???)
        if (toot?.reblog?.reblogged) {
            console.debug(`Removed retoot of id ${(0, helpers_1.describeToot)(toot)}: `, toot);
            return false;
        }
        // Sometimes there are wonky statuses that are like years in the future so we filter them out.
        if (Date.now() < (new Date(toot.createdAt)).getTime()) {
            console.warn(`Removed toot with future timestamp: `, toot);
            return false;
        }
        if (toot.filtered && toot.filtered.length > 0) {
            const filterMatch = toot.filtered[0];
            console.debug(`Removed toot that matched filter (${filterMatch.keywordMatches?.join(' ')}): `, toot);
            return false;
        }
        if (toot.account.username == this.user.username && toot.account.id == this.user.id) {
            console.debug(`Removing user's own toot from feed: `, toot);
            return false;
        }
        return true;
    }
    ;
    shouldReloadFeed() {
        const mostRecentTootAt = this.mostRecentTootAt();
        return ((Date.now() - mostRecentTootAt.getTime()) > RELOAD_IF_OLDER_THAN_MS);
    }
}
exports.TheAlgorithm = TheAlgorithm;
;
//# sourceMappingURL=index.js.map