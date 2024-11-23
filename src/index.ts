/*
 * Main class that handles scoring and sorting a feed made of Toot objects.
 */
import { mastodon } from "masto";

import {
    chaosFeatureScorer,
    diversityFeedScorer,
    favsFeatureScorer,
    interactsFeatureScorer,
    numFavoritesScorer,
    numRepliesScorer,
    reblogsFeatureScorer,
    reblogsFeedScorer,
    topPostFeatureScorer
} from "./scorer";
import { condensedStatus } from "./helpers";
import { ScoresType, Toot } from "./types";
import { TRENDING_POSTS } from "./scorer/feature/topPostFeatureScorer";
import getHomeFeed from "./feeds/homeFeed";
import Paginator from "./Paginator";
import Storage from "./Storage";
import topPostsFeed from "./feeds/topPostsFeed";
import WeightsStore from "./weights/weightsStore";
//import getRecommenderFeed from "./feeds/recommenderFeed";


class TheAlgorithm {
    api: mastodon.rest.Client;
    user: mastodon.v1.Account;
    feed: Toot[] = [];

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

    constructor(
        api: mastodon.rest.Client,
        user: mastodon.v1.Account,
        valueCalculator: (((scores: ScoresType) => Promise<number>) | null) = null,
    ) {
        this.api = api;
        this.user = user;
        Storage.setIdentity(user);
        Storage.logOpening();

        if (valueCalculator) {
            this._computeFinalScore = valueCalculator;
        }

        this.setDefaultWeights();
    }

    async getFeed(): Promise<Toot[]> {
        console.debug("getFeed() called in fedialgo package");
        const { fetchers, featureScorers, feedScorers } = this;
        const response = await Promise.all(fetchers.map(fetcher => fetcher(this.api, this.user)))

        // Inject condensedStatus instance method. // TODO: this feels like not the right place to do this.
        this.feed = response.flat().map((toot) => {
            toot.condensedStatus = () => condensedStatus(toot);
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
            const weights = await WeightsStore.getScoreWeightsMulti(Object.keys(scoreObj));

            // Add the various weighted and unweighted scores in the various categories to the toot object
            // mostly for logging purposes.
            toot.scores = scoreObj;  // TODO maybe rename this to scoreComponents or featureScores?
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
            .filter((item: Toot) => item != undefined)
            .filter((item: Toot) => item.inReplyToId === null)
            .filter((item: Toot) => item.content.includes("RT @") === false)
            .filter((item: Toot) => !(item?.reblog?.reblogged ?? false))
            .filter((item: Toot) => !(item?.reblog?.muted ?? false))
            .filter((item: Toot) => !(item?.muted ?? false))
            .map((item: Toot) => {
                // Multiple by time decay penalty
                const seconds = Math.floor((new Date().getTime() - new Date(item.createdAt).getTime()) / 1000);
                const timeDiscount = Math.pow((1 + 0.05), - Math.pow((seconds / 3600), 2));
                item.rawScore = item.value ?? 0;
                item.value = (item.value ?? 0) * timeDiscount;  // TODO: rename to "score" or "weightedScore"
                item.timeDiscount = timeDiscount;
                return item;
            });

        // Remove dupes // TODO: Can a toot trend on multiple servers? If so should we total its topPost scores?
        console.log(`Before removing duplicates feed contains ${scoredFeed.length} toots`);
        scoredFeed = [...new Map(scoredFeed.map((toot: Toot) => [toot["uri"], toot])).values()];
        console.log(`After removing duplicates feed contains ${scoredFeed.length} toots`);

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

    getScorerNames(): string[] {
        const scorers = [...this.featureScorers, ...this.feedScorers];
        return [...scorers.map(scorer => scorer.getScoreName())]
    }

    // Set Default Weights if they don't exist
    async setDefaultWeights(): Promise<void> {
        const scorers = [...this.featureScorers, ...this.feedScorers];

        Promise.all(scorers.map(scorer => WeightsStore.defaultFallback(
            scorer.getScoreName(),
            scorer.getDefaultWeight()
        )));
    }

    // Return the user's current weightings for each toot scorer
    async getScoreWeights(): Promise<ScoresType> {
        const scorerNames = this.getScorerNames();
        return await WeightsStore.getScoreWeightsMulti(scorerNames);
    }

    async weightTootsInFeed(userWeights: ScoresType): Promise<Toot[]> {
        //prevent userWeights from being set to 0
        for (const key in userWeights) {
            if (userWeights[key] == undefined || userWeights[key] == null || isNaN(userWeights[key])) {
                console.error("Weights not set because of error");
                return this.feed;
            }
        }

        console.log("weightTootsInFeed() called with 'userWeights' arg:", userWeights);
        await WeightsStore.setScoreWeightsMulti(userWeights);
        const scoredFeed: Toot[] = [];

        for (const toot of this.feed) {
            if (!toot.scores) return this.getFeed();

            toot.value = await this._computeFinalScore(toot.scores);
            scoredFeed.push(toot);
        }

        // TODO: this is still using the old weird sorting mechanics
        this.feed = scoredFeed.sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
        return this.feed;
    }

    // Get the longform human readable description for a given scorer
    getDescription(scorerName: string): string {
        const scorers = [...this.featureScorers, ...this.feedScorers];
        const scorer = scorers.find(scorer => scorer.getScoreName() === scorerName);

        if (scorer) {
            return scorer.getDescription();
        } else {
            return "No description found";
        }
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
        const currentWeight: ScoresType = await this.getScoreWeights()
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

    // Compute a weighted score a toot based by multiplying the value of each numerical property
    // by the user's chosen weighting for that property (the one configured with the GUI sliders).
    private async _computeFinalScore(scores: ScoresType): Promise<number> {
        const userWeightings = await WeightsStore.getScoreWeightsMulti(Object.keys(scores));
        const trendingTootWeighting = userWeightings[TRENDING_POSTS] || 0;

        let score = Object.keys(scores).reduce((score: number, scoreName: string) => {
            return score + (scores[scoreName] ?? 0) * (userWeightings[scoreName] ?? 0);
        }, 0);

        // Trending toots usually have a lot of reblogs, likes, replies, etc. so they get disproportionately
        // high scores. To fix this we hack a final adjustment to the score by multiplying by the
        // trending toot weighting if the weighting is less than 1.0.
        if (scores[TRENDING_POSTS] > 0 && trendingTootWeighting < 1.0) {
            console.debug(`Scaling down trending toot w/score ${score} by weighting of ${trendingTootWeighting}...`);
            score *= trendingTootWeighting;
        }

        if (score) {
            console.debug(`Computed score with:`, scores, `\n and userWeightings: `, userWeightings, `\n and got: `, score);
        } else {
            console.warn(`Failed to compute score with:`, scores, `\n and userWeightings: `, userWeightings, `\n and got: `, score);
        }

        return score;
    }

    private _getScoreObj(scoreNames: string[], scores: number[]): ScoresType {
        return scoreNames.reduce((obj: ScoresType, scoreName: string, i) => {
            obj[scoreName] = scores[i];
            return obj;
        }, {});
    }
};


// exports.condensedStatus = condensedStatus;
// export function condensedStatus;
export {
    condensedStatus,
    ScoresType,
    TheAlgorithm,
    Toot,
};
