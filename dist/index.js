"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TheAlgorithm = exports.condensedStatus = void 0;
const scorer_1 = require("./scorer");
const helpers_1 = require("./helpers");
Object.defineProperty(exports, "condensedStatus", { enumerable: true, get: function () { return helpers_1.condensedStatus; } });
const topPostFeatureScorer_1 = require("./scorer/feature/topPostFeatureScorer");
const homeFeed_1 = __importDefault(require("./feeds/homeFeed"));
const Paginator_1 = __importDefault(require("./Paginator"));
const Storage_1 = __importDefault(require("./Storage"));
const topPostsFeed_1 = __importDefault(require("./feeds/topPostsFeed"));
const weightsStore_1 = __importDefault(require("./weights/weightsStore"));
//import getRecommenderFeed from "./feeds/recommenderFeed";
class TheAlgorithm {
    api;
    user;
    feed = [];
    fetchers = [
        homeFeed_1.default,
        topPostsFeed_1.default
    ];
    // I think these scorers work in a standalone way and don't require the complete list to work?
    featureScorers = [
        new scorer_1.chaosFeatureScorer(),
        new scorer_1.favsFeatureScorer(),
        new scorer_1.interactsFeatureScorer(),
        new scorer_1.numFavoritesScorer(),
        new scorer_1.numRepliesScorer(),
        new scorer_1.reblogsFeatureScorer(),
        new scorer_1.topPostFeatureScorer(),
    ];
    // I think these scorers require the complete list and info about past user behavior to work?
    feedScorers = [
        new scorer_1.diversityFeedScorer(),
        new scorer_1.reblogsFeedScorer(),
    ];
    constructor(api, user, valueCalculator = null) {
        this.api = api;
        this.user = user;
        Storage_1.default.setIdentity(user);
        Storage_1.default.logAppOpen();
        this.setDefaultWeights();
        if (valueCalculator)
            this._computeFinalScore = valueCalculator;
    }
    async getFeed() {
        console.debug(`getFeed() called in fedialgo package...`);
        const { fetchers, featureScorers, feedScorers } = this;
        const response = await Promise.all(fetchers.map(fetcher => fetcher(this.api, this.user)));
        this.feed = response.flat();
        // Load and Prepare scored Features
        console.log(`Found ${this.feed.length} potential toots for feed.`);
        await Promise.all(featureScorers.map(scorer => scorer.getFeature(this.api)));
        await Promise.all(feedScorers.map(scorer => scorer.setFeed(this.feed)));
        // Get Score Names
        const scoreNames = featureScorers.map(scorer => scorer.getScoreName());
        const feedScoreNames = feedScorers.map(scorer => scorer.getScoreName());
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
        // Score Feed (should be mutating the toot AKA toot objects in place
        for (const toot of this.feed) {
            console.debug(`Scoring ${(0, helpers_1.describeToot)(toot)}: `, toot);
            toot.condensedStatus = () => (0, helpers_1.condensedStatus)(toot); // Inject condensedStatus() instance method // TODO: is this the right place to do this?
            // Load Scores for each toot
            const featureScore = await Promise.all(featureScorers.map(scorer => scorer.score(this.api, toot)));
            const feedScore = await Promise.all(feedScorers.map(scorer => scorer.score(toot)));
            // Turn Scores into Weight Objects
            const featureScoreObj = this._getScoreObj(scoreNames, featureScore);
            const feedScoreObj = this._getScoreObj(feedScoreNames, feedScore);
            const scoreObj = { ...featureScoreObj, ...feedScoreObj };
            const weights = await weightsStore_1.default.getUserWeightsMulti(Object.keys(scoreObj));
            // Add scores including weighted & unweighted components to the Toot for debugging/inspection
            toot.rawScore = (await this._computeFinalScore(scoreObj)) || 0;
            toot.scores = scoreObj; // TODO maybe rename this to scoreComponents or featureScores?
            toot.weightedScores = Object.assign({}, scoreObj);
            for (const scoreName in scoreObj) {
                toot.weightedScores[scoreName] = (scoreObj[scoreName] || 0) * (weights[scoreName] || 0);
            }
            // Multiple rawScore by time decay penalty to get a final value
            const seconds = Math.floor((new Date().getTime() - new Date(toot.createdAt).getTime()) / 1000);
            toot.timeDiscount = Math.pow((1 + 0.05), -Math.pow((seconds / 3600), 2));
            // TODO: "value" is not a good name for this. We should use "score", "weightedScore", "rank", or "computedScore"
            toot.value = (toot.rawScore ?? 0) * toot.timeDiscount;
        }
        // *NOTE: Sort feed based on score from high to low. This must come after the deduplication step.*
        this.feed = this.feed.sort((a, b) => {
            const aWeightedScore = a.value ?? 0;
            const bWeightedScore = b.value ?? 0;
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
    getScorerNames() {
        const scorers = [...this.featureScorers, ...this.feedScorers];
        return [...scorers.map(scorer => scorer.getScoreName())];
    }
    // Set Default Weights if they don't exist
    async setDefaultWeights() {
        const scorers = [...this.featureScorers, ...this.feedScorers];
        Promise.all(scorers.map(scorer => weightsStore_1.default.defaultFallback(scorer.getScoreName(), scorer.getDefaultWeight())));
    }
    // Return the user's current weightings for each score category
    async getUserWeights() {
        return await weightsStore_1.default.getUserWeightsMulti(this.getScorerNames());
    }
    // I think this is the main function that gets called when the user changes the weights of the sliders?
    // Otherwise scoring is done in getFeed().
    // *NOTE: has side effect of updating WeightsStore*
    async weightTootsInFeed(userWeights) {
        console.log("weightTootsInFeed() called with 'userWeights' arg:", userWeights);
        // prevent userWeights from being set to 0
        for (const key in userWeights) {
            if (userWeights[key] == undefined || userWeights[key] == null || isNaN(userWeights[key])) {
                console.warn("Weights not set because of invalid value! Not reweighting feed...");
                return this.feed;
            }
        }
        await weightsStore_1.default.setScoreWeightsMulti(userWeights);
        const scoredFeed = [];
        for (const toot of this.feed) {
            console.debug(`Reweighting ${(0, helpers_1.describeToot)(toot)}: `, toot);
            // TODO: Reloading the whole feed seems like a bad way to handle missing scores for one toot
            if (!toot.scores) {
                console.warn(`Toot #${toot.id} has no scores! Skipping rest of reweighting...`);
                return this.getFeed();
            }
            toot.value = await this._computeFinalScore(toot.scores);
            scoredFeed.push(toot);
        }
        // TODO: this is still using the old weird sorting mechanics
        this.feed = scoredFeed.sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
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
    // Compute a weighted score a toot based by multiplying the value of each numerical property
    // by the user's chosen weighting for that property (the one configured with the GUI sliders).
    async _computeFinalScore(scores) {
        console.debug(`_computeFinalScore() called with 'scores' arg: `, scores);
        const userWeightings = await weightsStore_1.default.getUserWeightsMulti(Object.keys(scores));
        const trendingTootWeighting = userWeightings[topPostFeatureScorer_1.TRENDING_POSTS] || 0;
        let score = Object.keys(scores).reduce((score, scoreName) => {
            return score + (scores[scoreName] ?? 0) * (userWeightings[scoreName] ?? 0);
        }, 0);
        // Trending toots usually have a lot of reblogs, likes, replies, etc. so they get disproportionately
        // high scores. To fix this we hack a final adjustment to the score by multiplying by the
        // trending toot weighting if the weighting is less than 1.0.
        if (scores[topPostFeatureScorer_1.TRENDING_POSTS] > 0 && trendingTootWeighting < 1.0) {
            console.debug(`Scaling down trending toot w/score ${score} by weighting of ${trendingTootWeighting}...`);
            score *= trendingTootWeighting;
        }
        if (score) {
            console.debug(`Computed score with:`, scores, `\n and userWeightings: `, userWeightings, `\n and got: `, score);
        }
        else {
            console.warn(`Failed to compute score with:`, scores, `\n and userWeightings: `, userWeightings, `\n and got: `, score);
        }
        return score;
    }
    _getScoreObj(scoreNames, scores) {
        return scoreNames.reduce((obj, scoreName, i) => {
            obj[scoreName] = scores[i];
            return obj;
        }, {});
    }
}
exports.TheAlgorithm = TheAlgorithm;
;
const isValidForFeed = (toot) => {
    if (toot == undefined)
        return false;
    if (toot?.inReplyToId !== null)
        return false; // Remove replies
    if (toot?.reblog?.muted || toot?.muted)
        return false; // Remove muted accounts and toots
    if (toot?.content?.includes("RT @"))
        return false; // Remove retweets (???)
    // Remove reblogs (???)
    if (toot?.reblog?.reblogged) {
        console.log(`Removed reblogged toot # : `, toot);
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