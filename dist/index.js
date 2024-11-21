"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const scorer_1 = require("./scorer");
const chaosFeatureScorer_1 = __importDefault(require("./scorer/feature/chaosFeatureScorer"));
const homeFeed_1 = __importDefault(require("./feeds/homeFeed"));
const Paginator_1 = __importDefault(require("./Paginator"));
const Storage_1 = __importDefault(require("./Storage"));
const topPostsFeed_1 = __importDefault(require("./feeds/topPostsFeed"));
const weightsStore_1 = __importDefault(require("./weights/weightsStore"));
//import getRecommenderFeed from "./feeds/recommenderFeed";
class TheAlgorithm {
    user;
    fetchers = [homeFeed_1.default, topPostsFeed_1.default];
    featureScorers = [
        new scorer_1.favsFeatureScorer(),
        new scorer_1.reblogsFeatureScorer(),
        new scorer_1.interactsFeatureScorer(),
        new scorer_1.topPostFeatureScorer(),
        new chaosFeatureScorer_1.default(),
    ];
    feedScorer = [new scorer_1.reblogsFeedScorer(), new scorer_1.diversityFeedScorer()];
    feed = [];
    api;
    constructor(api, user, valueCalculator = null) {
        this.api = api;
        this.user = user;
        Storage_1.default.setIdentity(user);
        Storage_1.default.logOpening();
        if (valueCalculator) {
            this._getValueFromScores = valueCalculator;
        }
        this.setDefaultWeights();
    }
    async getFeedAdvanced(fetchers, featureScorer, feedScorer) {
        this.fetchers = fetchers;
        this.featureScorers = featureScorer;
        this.feedScorer = feedScorer;
        return this.getFeed();
    }
    async getFeed() {
        console.log("getFeed() called in fedialgo package");
        const { fetchers, featureScorers, feedScorer } = this;
        const response = await Promise.all(fetchers.map(fetcher => fetcher(this.api, this.user)));
        this.feed = response.flat();
        // Load and Prepare Features
        await Promise.all(featureScorers.map(scorer => scorer.getFeature(this.api)));
        await Promise.all(feedScorer.map(scorer => scorer.setFeed(this.feed)));
        // Get Score Names
        const scoreNames = featureScorers.map(scorer => scorer.getVerboseName());
        const feedScoreNames = feedScorer.map(scorer => scorer.getVerboseName());
        // Score Feed
        let scoredFeed = [];
        for (const status of this.feed) {
            // Load Scores for each status
            const featureScore = await Promise.all(featureScorers.map(scorer => scorer.score(this.api, status)));
            const feedScore = await Promise.all(feedScorer.map(scorer => scorer.score(status)));
            // Turn Scores into Weight Objects
            const featureScoreObj = this._getScoreObj(scoreNames, featureScore);
            const feedScoreObj = this._getScoreObj(feedScoreNames, feedScore);
            const scoreObj = { ...featureScoreObj, ...feedScoreObj };
            // Add Weight Object to Status
            status["scores"] = scoreObj;
            status["value"] = await this._getValueFromScores(scoreObj); // TODO: "value" is not a good name fot this number
            scoredFeed.push(status);
        }
        // Remove Replies, Stuff Already Retweeted, and Nulls
        scoredFeed = scoredFeed
            .filter((item) => item != undefined)
            .filter((item) => item.inReplyToId === null)
            .filter((item) => item.content.includes("RT @") === false)
            .filter((item) => !(item?.reblog?.reblogged ?? false))
            .filter((item) => !(item?.reblog?.muted ?? false))
            .filter((item) => !(item?.muted ?? false));
        // Add Time Penalty
        scoredFeed = scoredFeed.map((item) => {
            const seconds = Math.floor((new Date().getTime() - new Date(item.createdAt).getTime()) / 1000);
            const timeDiscount = Math.pow((1 + 0.05), -Math.pow((seconds / 3600), 2));
            item.value = (item.value ?? 0) * timeDiscount;
            item.timeDiscount = timeDiscount;
            return item;
        });
        // Sort Feed (TODO: why was this using minus as the sort parameter?)
        // scoredFeed = scoredFeed.sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
        scoredFeed = scoredFeed.sort((a, b) => {
            const aWeightedScore = a.value ?? 0;
            const bWeightedScore = b.value ?? 0;
            if (aWeightedScore < bWeightedScore) {
                return -1;
            }
            else if (aWeightedScore > bWeightedScore) {
                return 1;
            }
            else {
                return 0;
            }
        });
        //Remove duplicates
        console.log(`Before removing duplicates feed contains ${scoredFeed.length} statuses`);
        scoredFeed = [...new Map(scoredFeed.map((item) => [item["uri"], item])).values()];
        console.log(`After removing duplicates feed contains ${scoredFeed.length} statuses`);
        this.feed = scoredFeed;
        return this.feed;
    }
    _getScoreObj(scoreNames, scores) {
        return scoreNames.reduce((obj, cur, i) => {
            obj[cur] = scores[i];
            return obj;
        }, {});
    }
    // Compute a weighted score value for a status based on the various inputs by scaling the
    // numerical score value in each criteria by the user setting that comes from the GUI sliders.
    async _getValueFromScores(scores) {
        const weights = await weightsStore_1.default.getWeightsMulti(Object.keys(scores));
        const weightedScores = Object.keys(scores).reduce((obj, cur) => {
            obj = obj + (scores[cur] ?? 0) * (weights[cur] ?? 0);
            return obj;
        }, 0);
        return weightedScores;
    }
    getWeightNames() {
        const scorers = [...this.featureScorers, ...this.feedScorer];
        return [...scorers.map(scorer => scorer.getVerboseName())];
    }
    async setDefaultWeights() {
        //Set Default Weights if they don't exist
        const scorers = [...this.featureScorers, ...this.feedScorer];
        Promise.all(scorers.map(scorer => weightsStore_1.default.defaultFallback(scorer.getVerboseName(), scorer.getDefaultWeight())));
    }
    getWeightDescriptions() {
        const scorers = [...this.featureScorers, ...this.feedScorer];
        return [...scorers.map(scorer => scorer.getDescription())];
    }
    async getWeights() {
        const verboseNames = this.getWeightNames();
        const weights = await weightsStore_1.default.getWeightsMulti(verboseNames);
        return weights;
    }
    async setWeights(weights) {
        console.log("setWeights() called in fedialgo package");
        //prevent weights from being set to 0
        for (const key in weights) {
            if (weights[key] == undefined || weights[key] == null || isNaN(weights[key])) {
                console.log("Weights not set because of error");
                return this.feed;
            }
        }
        await weightsStore_1.default.setWeightsMulti(weights);
        const scoredFeed = [];
        for (const status of this.feed) {
            if (!status["scores"]) {
                return this.getFeed();
            }
            status["value"] = await this._getValueFromScores(status["scores"]);
            scoredFeed.push(status);
        }
        // TODO: this is still using the old weird sorting mechanics
        this.feed = scoredFeed.sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
        return this.feed;
    }
    getDescription(verboseName) {
        const scorers = [...this.featureScorers, ...this.feedScorer];
        const scorer = scorers.find(scorer => scorer.getVerboseName() === verboseName);
        if (scorer) {
            return scorer.getDescription();
        }
        return "";
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
        const currentWeight = await this.getWeights();
        const currentTotal = Object.values(currentWeight)
            .filter((value) => !isNaN(value))
            .reduce((accumulator, currentValue) => accumulator + currentValue, 0);
        const currentMean = currentTotal / Object.values(currentWeight).length;
        for (const key in currentWeight) {
            const reweight = 1 - (Math.abs(statusWeights[key]) / mean) / (currentWeight[key] / currentMean);
            currentWeight[key] = currentWeight[key] - step * currentWeight[key] * reweight;
        }
        await this.setWeights(currentWeight);
        return currentWeight;
    }
    list() {
        return new Paginator_1.default(this.feed);
    }
}
exports.default = TheAlgorithm;
