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
        Storage_1.default.logOpening();
        if (valueCalculator) {
            this._computeFinalScore = valueCalculator;
        }
        this.setDefaultWeights();
    }
    async getFeed() {
        console.debug("getFeed() called in fedialgo package");
        const { fetchers, featureScorers, feedScorers } = this;
        const response = await Promise.all(fetchers.map(fetcher => fetcher(this.api, this.user)));
        // Inject condensedStatus instance method. // TODO: this feels like not the right place to do this.
        this.feed = response.flat().map((toot) => {
            toot.condensedStatus = () => (0, helpers_1.condensedStatus)(toot);
            return toot;
        });
        // Load and Prepare Features
        await Promise.all(featureScorers.map(scorer => scorer.getFeature(this.api)));
        await Promise.all(feedScorers.map(scorer => scorer.setFeed(this.feed)));
        // Get Score Names
        const scoreNames = featureScorers.map(scorer => scorer.getScoreName());
        const feedScoreNames = feedScorers.map(scorer => scorer.getScoreName());
        // Score Feed (should be mutating the toot AKA toot objects in place
        for (const toot of this.feed) {
            // Load Scores for each toot
            const featureScore = await Promise.all(featureScorers.map(scorer => scorer.score(this.api, toot)));
            const feedScore = await Promise.all(feedScorers.map(scorer => scorer.score(toot)));
            // Turn Scores into Weight Objects
            const featureScoreObj = this._getScoreObj(scoreNames, featureScore);
            const feedScoreObj = this._getScoreObj(feedScoreNames, feedScore);
            const scoreObj = { ...featureScoreObj, ...feedScoreObj };
            const weights = await weightsStore_1.default.getScoreWeightsMulti(Object.keys(scoreObj));
            // Add the various weighted and unweighted scores in the various categories to the toot object
            // mostly for logging purposes.
            toot.scores = scoreObj; // TODO maybe rename this to scoreComponents or featureScores?
            toot.weightedScores = Object.assign({}, scoreObj);
            // Add raw weighted scores for logging purposes
            for (const scoreName in scoreObj) {
                toot["weightedScores"][scoreName] = (scoreObj[scoreName] ?? 0) * (weights[scoreName] ?? 0);
            }
            // TODO: "value" is not a good name for this. We should use "score", "weightedScore", "rank", or "computedScore"
            toot.value = await this._computeFinalScore(scoreObj);
        }
        // Remove Replies, stuff already retooted, and Nulls
        let scoredFeed = this.feed
            .filter((item) => item != undefined)
            .filter((item) => item.inReplyToId === null)
            .filter((item) => item.content.includes("RT @") === false)
            .filter((item) => !(item?.reblog?.reblogged ?? false))
            .filter((item) => !(item?.reblog?.muted ?? false))
            .filter((item) => !(item?.muted ?? false))
            .map((item) => {
            // Multiple by time decay penalty
            const seconds = Math.floor((new Date().getTime() - new Date(item.createdAt).getTime()) / 1000);
            const timeDiscount = Math.pow((1 + 0.05), -Math.pow((seconds / 3600), 2));
            item.rawScore = item.value ?? 0;
            item.value = (item.value ?? 0) * timeDiscount; // TODO: rename to "score" or "weightedScore"
            item.timeDiscount = timeDiscount;
            return item;
        });
        // Remove dupes // TODO: Can a toot trend on multiple servers? If so should we total its topPost scores?
        console.log(`Before removing duplicates feed contains ${scoredFeed.length} toots`);
        scoredFeed = [...new Map(scoredFeed.map((toot) => [toot["uri"], toot])).values()];
        console.log(`After removing duplicates feed contains ${scoredFeed.length} toots`);
        // *NOTE: Sort feed based on score from high to low. This must come after the deduplication step.*
        this.feed = scoredFeed.sort((a, b) => {
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
    // Return the user's current weightings for each toot scorer
    async getScoreWeights() {
        const scorerNames = this.getScorerNames();
        return await weightsStore_1.default.getScoreWeightsMulti(scorerNames);
    }
    async weightTootsInFeed(userWeights) {
        //prevent userWeights from being set to 0
        for (const key in userWeights) {
            if (userWeights[key] == undefined || userWeights[key] == null || isNaN(userWeights[key])) {
                console.error("Weights not set because of error");
                return this.feed;
            }
        }
        console.log("weightTootsInFeed() called with 'userWeights' arg:", userWeights);
        await weightsStore_1.default.setScoreWeightsMulti(userWeights);
        const scoredFeed = [];
        for (const toot of this.feed) {
            if (!toot.scores)
                return this.getFeed();
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
    //Adjust post weights based on user's chosen slider values
    async weightAdjust(statusWeights, step = 0.001) {
        if (statusWeights == undefined)
            return;
        // Compute the total and mean score (AKA 'weight') of all the posts we are weighting
        const total = Object.values(statusWeights)
            .filter((value) => !isNaN(value))
            .reduce((accumulator, currentValue) => accumulator + Math.abs(currentValue), 0);
        const mean = total / Object.values(statusWeights).length;
        // Compute the sum and mean of the preferred weighting configured by the user with the weight sliders
        const currentWeight = await this.getScoreWeights();
        const currentTotal = Object.values(currentWeight)
            .filter((value) => !isNaN(value))
            .reduce((accumulator, currentValue) => accumulator + currentValue, 0);
        const currentMean = currentTotal / Object.values(currentWeight).length;
        for (const key in currentWeight) {
            const reweight = 1 - (Math.abs(statusWeights[key]) / mean) / (currentWeight[key] / currentMean);
            currentWeight[key] = currentWeight[key] - step * currentWeight[key] * reweight;
        }
        await this.weightTootsInFeed(currentWeight);
        return currentWeight;
    }
    list() {
        return new Paginator_1.default(this.feed);
    }
    // Compute a weighted score a toot based by multiplying the value of each numerical property
    // by the user's chosen weighting for that property (the one configured with the GUI sliders).
    async _computeFinalScore(scores) {
        const userWeightings = await weightsStore_1.default.getScoreWeightsMulti(Object.keys(scores));
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
        console.debug(`Computed score with: `, scores, `\n and userWeightings: `, userWeightings, `\n and got: `, score);
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
//# sourceMappingURL=index.js.map