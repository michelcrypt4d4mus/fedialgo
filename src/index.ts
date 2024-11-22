import { mastodon } from "masto";

import { TOP_POSTS } from "./scorer/feature/topPostFeatureScorer";
import { condensedStatus } from "./helpers";
import { StatusType, ScoresType } from "./types";
import {
    diversityFeedScorer,
    favsFeatureScorer,
    interactsFeatureScorer,
    numFavoritesScorer,
    numRepliesScorer,
    reblogsFeatureScorer,
    reblogsFeedScorer,
    topPostFeatureScorer
} from "./scorer";
import chaosFeatureScorer from "./scorer/feature/chaosFeatureScorer";
import getHomeFeed from "./feeds/homeFeed";
import Paginator from "./Paginator";
import Storage from "./Storage";
import topPostsFeed from "./feeds/topPostsFeed";
import WeightsStore from "./weights/weightsStore";
//import getRecommenderFeed from "./feeds/recommenderFeed";


export default class TheAlgorithm {
    user: mastodon.v1.Account;
    feed: StatusType[] = [];
    api: mastodon.rest.Client;

    fetchers = [
        getHomeFeed,
        topPostsFeed
    ];

    // I think these scorers work in a standalone way and don't require the complete list to work?
    featureScorers = [
        new chaosFeatureScorer(),
        new favsFeatureScorer(),
        new interactsFeatureScorer(),
        new numFavoritesScorer(),
        new numRepliesScorer(),
        new reblogsFeatureScorer(),
        new topPostFeatureScorer(),
    ];

    // I think these scorers require the complete list and info about past user behavior to work?
    feedScorers = [
        new diversityFeedScorer(),
        new reblogsFeedScorer(),
    ];

    constructor(api: mastodon.rest.Client, user: mastodon.v1.Account, valueCalculator: (((scores: ScoresType) => Promise<number>) | null) = null) {
        this.api = api;
        this.user = user;
        Storage.setIdentity(user);
        Storage.logOpening();
        if (valueCalculator) {
            this._computeFinalScore = valueCalculator;
        }
        this.setDefaultWeights();

        this.featureScorers.forEach(scorer => {
            console.log(`Set defaultWeight for ${scorer.constructor.name} to ${scorer.getDefaultWeight()}`);
        });
    }

    async getFeed(): Promise<StatusType[]> {
        console.debug("getFeed() called in fedialgo package");
        const { fetchers, featureScorers, feedScorers } = this;
        const response = await Promise.all(fetchers.map(fetcher => fetcher(this.api, this.user)))

        // Inject condensedStatus instance method. // TODO: this feels like not the right place to do this.
        this.feed = response.flat().map((status) => {
            status.condensedStatus = () => condensedStatus(status);
            return status;
        });

        // Load and Prepare Features
        await Promise.all(featureScorers.map(scorer => scorer.getFeature(this.api)));
        await Promise.all(feedScorers.map(scorer => scorer.setFeed(this.feed)));

        // Get Score Names
        const scoreNames = featureScorers.map(scorer => scorer.getVerboseName());
        const feedScoreNames = feedScorers.map(scorer => scorer.getVerboseName());

        // Score Feed (should be mutating the status AKA toot objects in place
        for (const status of this.feed) {
            // Load Scores for each toot
            const featureScore = await Promise.all(featureScorers.map(scorer => scorer.score(this.api, status)));
            const feedScore = await Promise.all(feedScorers.map(scorer => scorer.score(status)));
            // Turn Scores into Weight Objects
            const featureScoreObj = this._getScoreObj(scoreNames, featureScore);
            const feedScoreObj = this._getScoreObj(feedScoreNames, feedScore);
            const scoreObj = { ...featureScoreObj, ...feedScoreObj };
            const weights = await WeightsStore.getWeightsMulti(Object.keys(scoreObj));

            // Add the various weighted and unweighted scores in the various categories to the status object
            // mostly for logging purposes.
            status.scores = scoreObj;  // TODO maybe rename this to scoreComponents or featureScores?
            status.weightedScores = Object.assign({}, scoreObj);

            // Add raw weighted scores for logging purposes
            for (const scoreName in scoreObj) {
                status["weightedScores"][scoreName] = (scoreObj[scoreName] ?? 0) * (weights[scoreName] ?? 0);
            }

            // TODO: "value" is not a good name for this. We should use "score", "weightedScore", "rank", or "computedScore"
            status.value = await this._computeFinalScore(scoreObj);
        }

        // Remove Replies, stuff already retooted, and Nulls
        let scoredFeed = this.feed
            .filter((item: StatusType) => item != undefined)
            .filter((item: StatusType) => item.inReplyToId === null)
            .filter((item: StatusType) => item.content.includes("RT @") === false)
            .filter((item: StatusType) => !(item?.reblog?.reblogged ?? false))
            .filter((item: StatusType) => !(item?.reblog?.muted ?? false))
            .filter((item: StatusType) => !(item?.muted ?? false))
            .map((item: StatusType) => {
                // Multiple by time decay penalty
                const seconds = Math.floor((new Date().getTime() - new Date(item.createdAt).getTime()) / 1000);
                const timeDiscount = Math.pow((1 + 0.05), - Math.pow((seconds / 3600), 2));
                item.rawScore = item.value ?? 0;
                item.value = (item.value ?? 0) * timeDiscount;  // TODO: rename to "score" or "weightedScore"
                item.timeDiscount = timeDiscount;
                return item;
            });

        // Remove dupes // TODO: Can a toot trend on multiple servers? If so should we total its topPost scores?
        console.log(`Before removing duplicates feed contains ${scoredFeed.length} statuses`);
        scoredFeed = [...new Map(scoredFeed.map((toot: StatusType) => [toot["uri"], toot])).values()];
        console.log(`After removing duplicates feed contains ${scoredFeed.length} statuses`);

        // *NOTE: Sort feed based on score from high to low. This must come after the deduplication step.*
        this.feed = scoredFeed.sort((a, b) => {
            const aWeightedScore = a.value ?? 0;
            const bWeightedScore = b.value ?? 0;

            if (aWeightedScore < bWeightedScore) {
                return 1;
            } else if (aWeightedScore > bWeightedScore) {
                return -1;
            } else {
                return 0;
            }
        });

        return this.feed;
    }

    private _getScoreObj(scoreNames: string[], scores: number[]): ScoresType {
        return scoreNames.reduce((obj: ScoresType, cur, i) => {
            obj[cur] = scores[i];
            return obj;
        }, {});
    }

    // Compute a weighted score a toot based by multiplying the value of each numerical property
    // by the user's chosen weighting for that property (the one configured with the GUI sliders).
    private async _computeFinalScore(scores: ScoresType): Promise<number> {
        const userWeightings = await WeightsStore.getWeightsMulti(Object.keys(scores));
        let trendingTootWeighting = userWeightings[TOP_POSTS] || 0;

        let score = Object.keys(scores).reduce((score: number, cur) => {
            return score + (scores[cur] ?? 0) * (userWeightings[cur] ?? 0);
        }, 0);

        // Trending toots usually have a lot of reblogs, likes, replies, etc. so they get disproportionately
        // high scores. To fix this we hack a final adjustment to the score by multiplying by the
        // trending toot weighting if the weighting is less than 1.0.
        if (scores[TOP_POSTS] > 0 && trendingTootWeighting < 1.0) {
            console.log(`Scaling down trending toot w/score ${score} by weighting of ${trendingTootWeighting}...`);
            score *= trendingTootWeighting;
        }

        console.debug(`Computed score with: `, scores, `\n and userWeightings: `, userWeightings, `\n and got: `, score);
        return score;
    }

    getWeightNames(): string[] {
        const scorers = [...this.featureScorers, ...this.feedScorers];
        return [...scorers.map(scorer => scorer.getVerboseName())]
    }

    async setDefaultWeights(): Promise<void> {
        //Set Default Weights if they don't exist
        const scorers = [...this.featureScorers, ...this.feedScorers];
        Promise.all(scorers.map(scorer => WeightsStore.defaultFallback(
            scorer.getVerboseName(),
            scorer.getDefaultWeight()
        )));
    }

    getWeightDescriptions(): string[] {
        const scorers = [...this.featureScorers, ...this.feedScorers];
        return [...scorers.map(scorer => scorer.getDescription())]
    }

    // Return the user's current weightings for each toot scorer
    async getWeights(): Promise<ScoresType> {
        const verboseNames = this.getWeightNames();
        const weights = await WeightsStore.getWeightsMulti(verboseNames);
        return weights;
    }

    async weightTootsInFeed(userWeights: ScoresType): Promise<StatusType[]> {
        //prevent userWeights from being set to 0
        for (const key in userWeights) {
            if (userWeights[key] == undefined || userWeights[key] == null || isNaN(userWeights[key])) {
                console.error("Weights not set because of error");
                return this.feed;
            }
        }

        console.log("weightTootsInFeed() called in fedialgo package with 'userWeights' arg:", userWeights);
        await WeightsStore.setWeightsMulti(userWeights);
        const scoredFeed: StatusType[] = [];

        for (const status of this.feed) {
            if (!status["scores"]) {
                return this.getFeed();
            }
            status["value"] = await this._computeFinalScore(status["scores"]);
            scoredFeed.push(status);
        }
        // TODO: this is still using the old weird sorting mechanics
        this.feed = scoredFeed.sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
        return this.feed;
    }

    getDescription(verboseName: string): string {
        const scorers = [...this.featureScorers, ...this.feedScorers];
        const scorer = scorers.find(scorer => scorer.getVerboseName() === verboseName);
        if (scorer) {
            return scorer.getDescription();
        }
        return "";
    }

    //Adjust post weights based on user's chosen slider values
    async weightAdjust(statusWeights: ScoresType, step = 0.001): Promise<ScoresType | undefined> {
        if (statusWeights == undefined) return;

        // Compute the total and mean score (AKA 'weight') of all the posts we are weighting
        const total = Object.values(statusWeights)
                            .filter((value: number) => !isNaN(value))
                            .reduce((accumulator, currentValue) => accumulator + Math.abs(currentValue), 0);
        const mean = total / Object.values(statusWeights).length;

        // Compute the sum and mean of the preferred weighting configured by the user with the weight sliders
        const currentWeight: ScoresType = await this.getWeights()
        const currentTotal = Object.values(currentWeight)
                                   .filter((value: number) => !isNaN(value))
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
        return new Paginator(this.feed);
    }
};


exports.condensedStatus = condensedStatus;
// export function condensedStatus;
