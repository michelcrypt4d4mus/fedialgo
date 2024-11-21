import { mastodon } from "masto";
import { FeedFetcher, StatusType, weightsType } from "./types";
import {
    diversityFeedScorer,
    favsFeatureScorer,
    FeatureScorer,
    FeedScorer,
    interactsFeatureScorer,
    reblogsFeatureScorer,
    reblogsFeedScorer,
    topPostFeatureScorer
} from "./scorer";
import chaosFeatureScorer from "./scorer/feature/chaosFeatureScorer";
import getHomeFeed from "./feeds/homeFeed";
import Paginator from "./Paginator";
import Storage from "./Storage";
import topPostsFeed from "./feeds/topPostsFeed";
import weightsStore from "./weights/weightsStore";
//import getRecommenderFeed from "./feeds/recommenderFeed";

export default class TheAlgorithm {
    user: mastodon.v1.Account;
    fetchers = [getHomeFeed, topPostsFeed];
    featureScorers = [
        new favsFeatureScorer(),
        new reblogsFeatureScorer(),
        new interactsFeatureScorer(),
        new topPostFeatureScorer(),
        new chaosFeatureScorer(),
    ];
    feedScorer = [new reblogsFeedScorer(), new diversityFeedScorer()]
    feed: StatusType[] = [];
    api: mastodon.rest.Client;
    constructor(api: mastodon.rest.Client, user: mastodon.v1.Account, valueCalculator: (((scores: weightsType) => Promise<number>) | null) = null) {
        this.api = api;
        this.user = user;
        Storage.setIdentity(user);
        Storage.logOpening();
        if (valueCalculator) {
            this._getValueFromScores = valueCalculator;
        }
        this.setDefaultWeights();
    }

    async getFeedAdvanced(
        fetchers: Array<FeedFetcher>,
        featureScorer: Array<FeatureScorer>,
        feedScorer: Array<FeedScorer>
    ) {
        this.fetchers = fetchers;
        this.featureScorers = featureScorer;
        this.feedScorer = feedScorer;
        return this.getFeed();
    }

    async getFeed(): Promise<StatusType[]> {
        console.log("getFeed() called in fedialgo package");
        const { fetchers, featureScorers, feedScorer } = this;
        const response = await Promise.all(fetchers.map(fetcher => fetcher(this.api, this.user)))
        this.feed = response.flat();

        // Load and Prepare Features
        await Promise.all(featureScorers.map(scorer => scorer.getFeature(this.api)));
        await Promise.all(feedScorer.map(scorer => scorer.setFeed(this.feed)));

        // Get Score Names
        const scoreNames = featureScorers.map(scorer => scorer.getVerboseName());
        const feedScoreNames = feedScorer.map(scorer => scorer.getVerboseName());

        // Score Feed
        let scoredFeed: StatusType[] = []
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

        // Remove Replies, stuff already retooted, and Nulls
        scoredFeed = scoredFeed
            .filter((item: StatusType) => item != undefined)
            .filter((item: StatusType) => item.inReplyToId === null)
            .filter((item: StatusType) => item.content.includes("RT @") === false)
            .filter((item: StatusType) => !(item?.reblog?.reblogged ?? false))
            .filter((item: StatusType) => !(item?.reblog?.muted ?? false))
            .filter((item: StatusType) => !(item?.muted ?? false))


        // Add Time Penalty
        scoredFeed = scoredFeed.map((item: StatusType) => {
            const seconds = Math.floor((new Date().getTime() - new Date(item.createdAt).getTime()) / 1000);
            const timeDiscount = Math.pow((1 + 0.05), - Math.pow((seconds / 3600), 2));
            item.value = (item.value ?? 0) * timeDiscount;
            item.timeDiscount = timeDiscount;
            return item;
        })

        // Sort Feed (TODO: why was this using minus as the sort parameter?)
        // scoredFeed = scoredFeed.sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
        scoredFeed = scoredFeed.sort((a, b) => {
            const aWeightedScore = a.value ?? 0;
            const bWeightedScore = b.value ?? 0;

            if (aWeightedScore < bWeightedScore) {
                return -1;
            } else if (aWeightedScore > bWeightedScore) {
                return 1;
            } else {
                return 0;
            }
        });

        //Remove duplicates
        console.log(`Before removing duplicates feed contains ${scoredFeed.length} statuses`);
        scoredFeed = [...new Map(scoredFeed.map((item: StatusType) => [item["uri"], item])).values()];
        console.log(`After removing duplicates feed contains ${scoredFeed.length} statuses`);

        this.feed = scoredFeed;
        return this.feed;
    }

    private _getScoreObj(scoreNames: string[], scores: number[]): weightsType {
        return scoreNames.reduce((obj: weightsType, cur, i) => {
            obj[cur] = scores[i];
            return obj;
        }, {});
    }

    // Compute a weighted score value for a status based on the various inputs by scaling the
    // numerical score value in each criteria by the user setting that comes from the GUI sliders.
    private async _getValueFromScores(scores: weightsType): Promise<number> {
        const weights = await weightsStore.getWeightsMulti(Object.keys(scores));
        const weightedScores = Object.keys(scores).reduce((obj: number, cur) => {
            obj = obj + (scores[cur] ?? 0) * (weights[cur] ?? 0);
            return obj;
        }, 0);
        return weightedScores;
    }

    getWeightNames(): string[] {
        const scorers = [...this.featureScorers, ...this.feedScorer];
        return [...scorers.map(scorer => scorer.getVerboseName())]
    }

    async setDefaultWeights(): Promise<void> {
        //Set Default Weights if they don't exist
        const scorers = [...this.featureScorers, ...this.feedScorer];
        Promise.all(scorers.map(scorer => weightsStore.defaultFallback(scorer.getVerboseName(), scorer.getDefaultWeight())))
    }

    getWeightDescriptions(): string[] {
        const scorers = [...this.featureScorers, ...this.feedScorer];
        return [...scorers.map(scorer => scorer.getDescription())]
    }

    async getWeights(): Promise<weightsType> {
        const verboseNames = this.getWeightNames();
        const weights = await weightsStore.getWeightsMulti(verboseNames);
        return weights;
    }

    async setWeights(weights: weightsType): Promise<StatusType[]> {
        console.log("setWeights() called in fedialgo package");

        //prevent weights from being set to 0
        for (const key in weights) {
            if (weights[key] == undefined || weights[key] == null || isNaN(weights[key])) {
                console.log("Weights not set because of error");
                return this.feed
            }
        }
        await weightsStore.setWeightsMulti(weights);
        const scoredFeed: StatusType[] = []
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

    getDescription(verboseName: string): string {
        const scorers = [...this.featureScorers, ...this.feedScorer];
        const scorer = scorers.find(scorer => scorer.getVerboseName() === verboseName);
        if (scorer) {
            return scorer.getDescription();
        }
        return "";
    }

    //Adjust post weights based on user's chosen slider values
    async weightAdjust(statusWeights: weightsType, step = 0.001): Promise<weightsType | undefined> {
        if (statusWeights == undefined) return;

        // Compute the total and mean score (AKA 'weight') of all the posts we are weighting
        const total = Object.values(statusWeights)
                            .filter((value: number) => !isNaN(value))
                            .reduce((accumulator, currentValue) => accumulator + Math.abs(currentValue), 0);
        const mean = total / Object.values(statusWeights).length;

        // Compute the sum and mean of the preferred weighting configured by the user with the weight sliders
        const currentWeight: weightsType = await this.getWeights()
        const currentTotal = Object.values(currentWeight)
                                   .filter((value: number) => !isNaN(value))
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
        return new Paginator(this.feed);
    }
}
