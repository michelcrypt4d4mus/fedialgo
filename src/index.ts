/*
 * Main class that handles scoring and sorting a feed made of Toot objects.
 */
import { mastodon } from "masto";

import {
    ChaosFeatureScorer,
    DiversityFeedScorer,
    FavsFeatureScorer,
    FollowedTagsFeatureScorer,
    ImageAttachmentScorer,
    InteractionsFeatureScorer,
    NumFavoritesScorer,
    NumRepliesScorer,
    ReblogsFeatureScorer,
    ReblogsFeedScorer,
    RepliedFeatureScorer,
    TopPostFeatureScorer,
    VideoAttachmentScorer,
} from "./scorer";
import { condensedStatus, describeToot } from "./helpers";
import { ScoresType, Toot, TootScore } from "./types";
import { TRENDING_TOOTS } from "./scorer/feature/topPostFeatureScorer";
import MastodonApiCache from "./features/mastodon_api_cache";
import getHomeFeed from "./feeds/homeFeed";
import Paginator from "./Paginator";
import Storage from "./Storage";
import topPostsFeed from "./feeds/topPostsFeed";
import WeightsStore from "./weights/weightsStore";
//import getRecommenderFeed from "./feeds/recommenderFeed";

const TIME_DECAY = 'TimeDecay';
const DEFAULT_TIME_DECAY = 0.05;


class TheAlgorithm {
    api: mastodon.rest.Client;
    user: mastodon.v1.Account;
    feed: Toot[] = [];

    fetchers = [
        getHomeFeed,
        topPostsFeed
    ];

    // These can score a toot without knowing about the rest of the toots in the feed
    featureScorers = [
        new ChaosFeatureScorer(),
        new FavsFeatureScorer(),
        new FollowedTagsFeatureScorer(),
        new ImageAttachmentScorer(),
        new InteractionsFeatureScorer(),
        new NumFavoritesScorer(),
        new NumRepliesScorer(),
        new ReblogsFeatureScorer(),
        new RepliedFeatureScorer(),
        new TopPostFeatureScorer(),
        new VideoAttachmentScorer(),
    ];

    // These scorers require the complete feed to work properly
    feedScorers = [
        new DiversityFeedScorer(),
        new ReblogsFeedScorer(),
    ];

    weightedScorers = [...this.featureScorers, ...this.feedScorers];
    featureScoreNames = this.featureScorers.map(scorer => scorer.getScoreName());
    feedScoreNames = this.feedScorers.map(scorer => scorer.getScoreName());
    weightedScoreNames = this.weightedScorers.map(scorer => scorer.getScoreName());
    allScoreNames = this.weightedScoreNames.concat([TIME_DECAY]);

    constructor(api: mastodon.rest.Client, user: mastodon.v1.Account) {
        this.api = api;
        this.user = user;
        Storage.setIdentity(user);
        Storage.logAppOpen();
        this.setDefaultWeights();
    }

    // Fetch toots for the timeline from accounts the user follows as well as trending toots in
    // the fediverse, score them, and sort them.
    async getFeed(): Promise<Toot[]> {
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
        cleanFeed = [...new Map(cleanFeed.map((toot: Toot) => [toot.uri, toot])).values()];
        console.log(`Removed ${numValid - cleanFeed.length} duplicate toots, leaving ${cleanFeed.length}.`);
        this.feed = cleanFeed;

        // Score toots in feed (mutates the Toot objects)
        for (const toot of this.feed) {
            await this._decorateWithScoreInfo(toot);
        }

        return this.sortFeed();
    }

    // Rescores the toots in the feed. Gets called when the user changes the weightings.
    // Has side effect of updating WeightsStore.
    async weightTootsInFeed(userWeights: ScoresType): Promise<Toot[]> {
        console.log("weightTootsInFeed() called with 'userWeights' arg:", userWeights);
        // TODO: DiversityFeedScorer mutates its feed state so setFeed() must be called each scoring
        await Promise.all(this.feedScorers.map(scorer => scorer.setFeed(this.feed)));

        // prevent userWeights from being set to 0
        for (const key in userWeights) {
            if (userWeights[key] == null || isNaN(userWeights[key])) {
                console.warn(`Invalid value for '${key}'! Setting to 0...`);
                userWeights[key] = 0;
            }
        }

        await WeightsStore.setScoreWeightsMulti(userWeights);
        const scoredFeed: Toot[] = [];

        for (const toot of this.feed) {
            console.debug(`Reweighting ${describeToot(toot)}: `, toot);

            // Reload the feed if any toots are missing scores
            if (!toot.scoreInfo?.rawScores) {
                console.warn(`Toot #${toot.id} has no scores! Skipping rest of reweighting...`);
                return this.getFeed();
            }

            scoredFeed.push(await this._decorateWithScoreInfo(toot));
        }

        return this.sortFeed();
    }

    // Set Default Weights if they don't exist
    async setDefaultWeights(): Promise<void> {
        await Promise.all(this.weightedScorers.map(scorer => WeightsStore.defaultFallback(
            scorer.getScoreName(),
            scorer.getDefaultWeight()
        )));

        WeightsStore.defaultFallback(TIME_DECAY, DEFAULT_TIME_DECAY);
    }

    // Return the user's current weightings for each score category
    async getUserWeights(): Promise<ScoresType> {
        return await WeightsStore.getUserWeightsMulti(this.allScoreNames);
    }

    // Get the longform human readable description for a given scorer
    getDescription(scorerName: string): string {
        const scorer = this.weightedScorers.find(scorer => scorer.getScoreName() === scorerName);

        if (scorer) {
            return scorer.getDescription();
        } else {
            return "No description found";
        }
    }

    // Adjust toot weights based on user's chosen slider values
    async learnWeights(tootScores: ScoresType, step = 0.001): Promise<ScoresType | undefined> {
        console.debug(`learnWeights() called with 'tootScores' arg: `, tootScores);
        if (tootScores == undefined) return;

        // Compute the total and mean score (AKA 'weight') of all the posts we are weighting
        const total = Object.values(tootScores)
                            .filter((value: number) => !isNaN(value))
                            .reduce((accumulator, currentValue) => accumulator + Math.abs(currentValue), 0);

        const mean = total / Object.values(tootScores).length;
        // Compute the sum and mean of the preferred weighting configured by the user with the weight sliders
        const newTootScores: ScoresType = await this.getUserWeights()

        const userWeightTotal = Object.values(newTootScores)
                                   .filter((value: number) => !isNaN(value))
                                   .reduce((accumulator, currentValue) => accumulator + currentValue, 0);

        const meanUserWeight = userWeightTotal / Object.values(newTootScores).length;

        for (const key in newTootScores) {
            const reweight = 1 - (Math.abs(tootScores[key]) / mean) / (newTootScores[key] / meanUserWeight);
            newTootScores[key] = newTootScores[key] - (step * newTootScores[key] * reweight);  // TODO: this seems wrong?
        }

        await this.weightTootsInFeed(newTootScores);
        return newTootScores;
    }

    list() {
        return new Paginator(this.feed);
    }

    // Debugging method to log info about the timeline toots
    logFeedInfo() {
        if (!this.feed || this.feed.length == 0) {
            console.warn(`No feed to log!`);
            return;
        }

        console.log(`timeline toots (condensed): `, this.feed.map(condensedStatus));

        const appCounts = this.feed.reduce((counts, toot) => {
            const app = toot.application?.name || "unknown";
            counts[app] = (counts[app] || 0) + 1;
            return counts;
        }, {} as ScoresType);

        console.debug(`feed toots posted by application counts: `, appCounts);
    }

    // Add scores including weighted & unweighted components to the Toot for debugging/inspection
    private async _decorateWithScoreInfo(toot: Toot): Promise<Toot> {
        // console.debug(`_decorateWithScoreInfo ${describeToot(toot)}: `, toot);
        const scores = await Promise.all(this.weightedScorers.map(scorer => scorer.score(toot)));
        const userWeights = await this.getUserWeights();

        const rawScores = {} as ScoresType;
        const weightedScores = {} as ScoresType;
        let rawScore = 1;

        // Compute a weighted score a toot based by multiplying the value of each numerical property
        // by the user's chosen weighting for that property (the one configured with the GUI sliders).
        this.weightedScoreNames.forEach((scoreName, i) => {
            const scoreValue = scores[i] || 0;
            rawScores[scoreName] = scoreValue;
            weightedScores[scoreName] = scoreValue * (userWeights[scoreName] ?? 0);
            rawScore += weightedScores[scoreName];
        });

        // Trending toots usually have a lot of reblogs, likes, replies, etc. so they get disproportionately
        // high scores. To fix this we hack a final adjustment to the score by multiplying by the
        // trending toot weighting if the weighting is less than 1.0.
        const trendingTootScore = rawScores[TRENDING_TOOTS] ?? 0;
        const trendingTootWeighting = userWeights[TRENDING_TOOTS] ?? 0;

        if (trendingTootScore > 0 && trendingTootWeighting < 1.0) {
            rawScore *= trendingTootWeighting;
        }

        // Multiple rawScore by time decay penalty to get a final value
        const timeDecay = userWeights[TIME_DECAY] || DEFAULT_TIME_DECAY;
        const seconds = Math.floor((new Date().getTime() - new Date(toot.createdAt).getTime()) / 1000);
        const timeDecayMultiplier = Math.pow((1 + timeDecay), -1 * Math.pow((seconds / 3600), 2));
        const score = rawScore * timeDecayMultiplier;

        toot.scoreInfo = {
            rawScore,
            rawScores,
            score,
            timeDecayMultiplier,
            weightedScores,
        } as TootScore;

        // If it's a retoot copy the scores to the retooted toot as well // TODO: this is janky
        if (toot.reblog) toot.reblog.scoreInfo = toot.scoreInfo;

        // Inject condensedStatus() instance method // TODO: is this the right way to do this?
        toot.condensedStatus = () => condensedStatus(toot);
        return toot;
    }

    // Sort feed based on score from high to low. This must come after the deduplication step.
    private sortFeed() {
        this.feed.sort((a, b) => (b.scoreInfo?.score ?? 0) - (a.scoreInfo?.score ?? 0));
        return this.feed;
    }
};


const isValidForFeed = (toot: Toot): boolean => {
    if (toot == undefined) return false;
    if (toot?.reblog?.muted || toot?.muted) return false;  // Remove muted accounts and toots
    if (toot?.content?.includes("RT @")) return false;  // Remove retweets (???)

    // Remove retoots (i guess things user has already retooted???)
    if (toot?.reblog?.reblogged) {
        console.debug(`Removed retoot of id ${describeToot(toot)}: `, toot);
        return false;
    }

    // Sometimes there are wonky statuses that are like years in the future so we filter them out.
    if (Date.now() < (new Date(toot.createdAt)).getTime()) {
        console.warn(`Removed toot with future timestamp: `, toot);
        return false;
    }

    return true;
};


export {
    DEFAULT_TIME_DECAY,
    TIME_DECAY,
    TRENDING_TOOTS,
    MastodonApiCache,
    ScoresType,
    TheAlgorithm,
    Toot,
};
