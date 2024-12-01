"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TheAlgorithm = exports.MastodonApiCache = exports.extractScoreInfo = exports.condensedStatus = exports.TRENDING_TOOTS = exports.TIME_DECAY = exports.DEFAULT_TIME_DECAY = void 0;
const scorer_1 = require("./scorer");
const helpers_1 = require("./helpers");
Object.defineProperty(exports, "condensedStatus", { enumerable: true, get: function () { return helpers_1.condensedStatus; } });
Object.defineProperty(exports, "extractScoreInfo", { enumerable: true, get: function () { return helpers_1.extractScoreInfo; } });
const topPostFeatureScorer_1 = require("./scorer/feature/topPostFeatureScorer");
Object.defineProperty(exports, "TRENDING_TOOTS", { enumerable: true, get: function () { return topPostFeatureScorer_1.TRENDING_TOOTS; } });
const mastodon_api_cache_1 = __importDefault(require("./features/mastodon_api_cache"));
exports.MastodonApiCache = mastodon_api_cache_1.default;
const homeFeed_1 = __importDefault(require("./feeds/homeFeed"));
const Paginator_1 = __importDefault(require("./Paginator"));
const Storage_1 = __importDefault(require("./Storage"));
const topPostsFeed_1 = __importDefault(require("./feeds/topPostsFeed"));
const weightsStore_1 = __importDefault(require("./weights/weightsStore"));
//import getRecommenderFeed from "./feeds/recommenderFeed";
const TIME_DECAY = 'TimeDecay';
exports.TIME_DECAY = TIME_DECAY;
const DEFAULT_TIME_DECAY = 0.05;
exports.DEFAULT_TIME_DECAY = DEFAULT_TIME_DECAY;
class TheAlgorithm {
    api;
    user;
    feed = [];
    fetchers = [
        homeFeed_1.default,
        topPostsFeed_1.default
    ];
    // Scorers that are atomic in the sense that they can score a tool without knowing
    // about the rest of the toots in the TL.
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
    // I think these scorers require the complete list and info about past user behavior to work?
    feedScorers = [
        new scorer_1.DiversityFeedScorer(),
        new scorer_1.ReblogsFeedScorer(),
    ];
    featureScoreNames = this.featureScorers.map(scorer => scorer.getScoreName());
    feedScoreNames = this.feedScorers.map(scorer => scorer.getScoreName());
    weightedScorers = [...this.featureScorers, ...this.feedScorers];
    weightedScoreNames = this.weightedScorers.map(scorer => scorer.getScoreName());
    allScoreNames = this.weightedScoreNames.concat([TIME_DECAY]);
    constructor(api, user) {
        this.api = api;
        this.user = user;
        Storage_1.default.setIdentity(user);
        Storage_1.default.logAppOpen();
        this.setDefaultWeights();
    }
    // Fetch toots for the timeline from accounts the user follows as well as trending toots in
    // the fediverse, score them, and sort them.
    async getFeed() {
        console.debug(`getFeed() called in fedialgo package...`);
        const response = await Promise.all(this.fetchers.map(fetcher => fetcher(this.api, this.user)));
        this.feed = response.flat();
        console.log(`Found ${this.feed.length} potential toots for feed.`);
        // Load and Prepare scored Features
        await Promise.all(this.featureScorers.map(scorer => scorer.getFeature(this.api)));
        await Promise.all(this.feedScorers.map(scorer => scorer.setFeed(this.feed)));
        // Remove replies, stuff already retooted, invalid future timestamps, nulls, etc.
        let cleanFeed = this.feed.filter(isValidForFeed);
        const numRemoved = this.feed.length - cleanFeed.length;
        console.log(`Removed ${numRemoved} invalid toots (of ${this.feed.length}) from feed leaving ${cleanFeed.length}`);
        // Remove dupes by uniquifying on the URI
        // TODO: Can a toot trend on multiple servers? If so should we total its topPost scores?
        const numValid = cleanFeed.length;
        cleanFeed = [...new Map(cleanFeed.map((toot) => [toot.uri, toot])).values()];
        console.log(`Removed ${numValid - cleanFeed.length} duplicate toots, leaving ${cleanFeed.length}.`);
        this.feed = cleanFeed;
        // Score toots in feed (mutates the Toot objects)
        for (const toot of this.feed) {
            await this._decorateWithScoreInfo(toot);
        }
        // *NOTE: Sort feed based on score from high to low. This must come after the deduplication step.*
        this.feed = this.feed.sort((a, b) => {
            const aWeightedScore = a.score ?? 0;
            const bWeightedScore = b.score ?? 0;
            if (aWeightedScore < bWeightedScore) {
                return 1;
            }
            else if (aWeightedScore > bWeightedScore) {
                return -1;
            }
            else {
                return 0;
            }
        });
        return this.feed;
    }
    // Set Default Weights if they don't exist
    async setDefaultWeights() {
        const scorers = [...this.featureScorers, ...this.feedScorers];
        await Promise.all(scorers.map(scorer => weightsStore_1.default.defaultFallback(scorer.getScoreName(), scorer.getDefaultWeight())));
        weightsStore_1.default.defaultFallback(TIME_DECAY, DEFAULT_TIME_DECAY);
    }
    // Return the user's current weightings for each score category
    async getUserWeights() {
        return await weightsStore_1.default.getUserWeightsMulti(this.allScoreNames);
    }
    // I think this is the main function that gets called when the user changes the weights of the sliders?
    // Otherwise scoring is done in getFeed().
    // *NOTE: has side effect of updating WeightsStore*
    async weightTootsInFeed(userWeights) {
        console.log("weightTootsInFeed() called with 'userWeights' arg:", userWeights);
        // prevent userWeights from being set to 0
        for (const key in userWeights) {
            if (userWeights[key] == undefined || userWeights[key] == null || isNaN(userWeights[key])) {
                console.warn(`Invalid value for '${key}'! Setting to 0...`);
                userWeights[key] = 0;
            }
        }
        await weightsStore_1.default.setScoreWeightsMulti(userWeights);
        const scoredFeed = [];
        for (const toot of this.feed) {
            console.debug(`Reweighting ${(0, helpers_1.describeToot)(toot)}: `, toot);
            // TODO: Reloading the whole feed seems like a bad way to handle missing scores for one toot
            if (!toot.rawScores) {
                console.warn(`Toot #${toot.id} has no scores! Skipping rest of reweighting...`);
                return this.getFeed();
            }
            scoredFeed.push(await this._decorateWithScoreInfo(toot));
        }
        // TODO: this is still using the old weird sorting mechanics
        this.feed = scoredFeed.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
        return this.feed;
    }
    // Get the longform human readable description for a given scorer
    getDescription(scorerName) {
        const scorers = [...this.featureScorers, ...this.feedScorers];
        const scorer = scorers.find(scorer => scorer.getScoreName() === scorerName);
        if (scorer) {
            return scorer.getDescription();
        }
        else {
            return "No description found";
        }
    }
    // Adjust toot weights based on user's chosen slider values
    async learnWeights(tootScores, step = 0.001) {
        console.debug(`learnWeights() called with 'tootScores' arg: `, tootScores);
        if (tootScores == undefined)
            return;
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
        await this.weightTootsInFeed(newTootScores);
        return newTootScores;
    }
    list() {
        return new Paginator_1.default(this.feed);
    }
    // Debugging method to log info about the timeline toots
    logFeedInfo() {
        if (!this.feed || this.feed.length == 0) {
            console.warn(`No feed to log!`);
            return;
        }
        console.log(`timeline toots (condensed): `, this.feed.map(helpers_1.condensedStatus));
        const appCounts = this.feed.reduce((counts, toot) => {
            const app = toot.application?.name || "unknown";
            counts[app] = (counts[app] || 0) + 1;
            return counts;
        }, {});
        console.debug(`feed toots posted by application counts: `, appCounts);
    }
    // Add scores including weighted & unweighted components to the Toot for debugging/inspection
    async _decorateWithScoreInfo(toot) {
        console.debug(`_decorateWithScoreInfo ${(0, helpers_1.describeToot)(toot)}: `, toot);
        const scores = await Promise.all(this.weightedScorers.map(scorer => scorer.score(toot)));
        const userWeights = await this.getUserWeights();
        toot.rawScore = 1;
        // Compute a weighted score a toot based by multiplying the value of each numerical property
        // by the user's chosen weighting for that property (the one configured with the GUI sliders).
        this.weightedScoreNames.forEach((scoreName, i) => {
            const scoreValue = scores[i] || 0;
            toot.weightedScores ??= {};
            toot.rawScores ??= {};
            toot.rawScore ??= 1; // Start at 1 so if all weights are 0 timeline is reverse chronological order
            toot.weightedScores[scoreName] = scoreValue * (userWeights[scoreName] || 0);
            toot.rawScores[scoreName] = scoreValue;
            toot.rawScore += toot.weightedScores[scoreName];
        });
        // Trending toots usually have a lot of reblogs, likes, replies, etc. so they get disproportionately
        // high scores. To fix this we hack a final adjustment to the score by multiplying by the
        // trending toot weighting if the weighting is less than 1.0.
        const trendingTootScore = toot.rawScores?.[topPostFeatureScorer_1.TRENDING_TOOTS] || 0;
        const trendingTootWeighting = userWeights[topPostFeatureScorer_1.TRENDING_TOOTS] || 0;
        if (trendingTootScore > 0 && trendingTootWeighting < 1.0) {
            toot.rawScore *= trendingTootWeighting;
        }
        // Multiple rawScore by time decay penalty to get a final value
        const timeDecay = userWeights[TIME_DECAY] || DEFAULT_TIME_DECAY;
        const seconds = Math.floor((new Date().getTime() - new Date(toot.createdAt).getTime()) / 1000);
        toot.timeDecayMultiplier = Math.pow((1 + timeDecay), -1 * Math.pow((seconds / 3600), 2));
        toot.score = toot.rawScore * toot.timeDecayMultiplier;
        // If it's a retoot populate all the scores on the retooted toot as well // TODO: this is janky
        if (toot.reblog) {
            toot.reblog.rawScore = toot.rawScore;
            toot.reblog.rawScores = toot.rawScores;
            toot.reblog.weightedScores = toot.weightedScores;
            toot.reblog.timeDecayMultiplier = toot.timeDecayMultiplier;
            toot.reblog.score = toot.score;
        }
        // console.debug(`after _decorateWithScoreInfo ${describeToot(toot)}: `, toot);
        // Inject condensedStatus() instance method // TODO: is this the right way to do this?
        toot.condensedStatus = () => (0, helpers_1.condensedStatus)(toot);
        return toot;
    }
}
exports.TheAlgorithm = TheAlgorithm;
;
const isValidForFeed = (toot) => {
    if (toot == undefined)
        return false;
    if (toot?.reblog?.muted || toot?.muted)
        return false; // Remove muted accounts and toots
    if (toot?.content?.includes("RT @"))
        return false; // Remove retweets (???)
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
    return true;
};
//# sourceMappingURL=index.js.map