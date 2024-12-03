/*
 * Main class that handles scoring and sorting a feed made of Toot objects.
 */
import { mastodon } from "masto";
import { E_CANCELED, Mutex } from 'async-mutex';

import getHomeFeed from "./feeds/homeFeed";
import Paginator from "./Paginator";
import Storage, { DEFAULT_FILTERS } from "./Storage";
import topPostsFeed from "./feeds/topPostsFeed";
import {
    AlgorithmArgs,
    FeedFilterSettings,
    ScorerDict,
    ScorerInfo,
    StringNumberDict,
    Toot,
    TootScore
} from "./types";
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
import { condensedStatus, createRandomString, describeToot } from "./helpers";
import { TRENDING_TOOTS } from "./scorer/feature/topPostFeatureScorer";
//import getRecommenderFeed from "./feeds/recommenderFeed";

const ENGLISH_CODE = 'en';
const NO_LANGUAGE = '[not specified]';
const EARLIEST_TIMESTAMP = new Date("1970-01-01T00:00:00.000Z");
const RELOAD_IF_OLDER_THAN_MINUTES = 0.5;
const RELOAD_IF_OLDER_THAN_MS = RELOAD_IF_OLDER_THAN_MINUTES * 60 * 1000;

const TIME_DECAY = 'TimeDecay';
const TIME_DECAY_DEFAULT = 0.05;

// Time Decay works differently from the rest so this is a ScorerInfo object w/out the Scorer
const TIME_DECAY_INFO = {
    defaultWeight: TIME_DECAY_DEFAULT,
    description: "Higher values means toots are demoted sooner",
} as ScorerInfo;


class TheAlgorithm {
    api: mastodon.rest.Client;
    user: mastodon.v1.Account;
    filters: FeedFilterSettings;

    feed: Toot[] = [];
    feedLanguages: StringNumberDict = {};
    scoreMutex = new Mutex();
    setFeedInApp: (f: Toot[]) => void = (f) => console.log(`Default setFeedInApp() called...`);  // Optional callback to set the feed in enclosing app

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
    featureScoreNames = this.featureScorers.map(scorer => scorer.name);
    feedScoreNames = this.feedScorers.map(scorer => scorer.name);
    weightedScoreNames = this.weightedScorers.map(scorer => scorer.name);

    scorersDict = this.weightedScorers.reduce(
        (descriptions, scorer) => {
            descriptions[scorer.name] = scorer.getInfo();
            return descriptions;
        },
        {[TIME_DECAY]: Object.assign({}, TIME_DECAY_INFO)} as ScorerDict
    );

    // This is the alternate constructor() that instantiates the class and loads the feed from storage.
    // See: https://www.reddit.com/r/typescript/comments/1fnn38f/asynchronous_constructors_in_typescript/
    static async create(params: AlgorithmArgs): Promise<TheAlgorithm> {
        const algo = new TheAlgorithm(params);
        await Storage.setIdentity(params.user);
        await Storage.logAppOpen();
        await algo.setDefaultWeights();

        algo.filters = await Storage.getFilters();
        algo.feed = await Storage.getFeed();
        algo.setFeedInApp(algo.feed);
        return algo;
    }

    private constructor(params: AlgorithmArgs) {
        this.api = params.api;
        this.user = params.user;
        this.setFeedInApp = params.setFeedInApp ?? this.setFeedInApp;
        this.filters = JSON.parse(JSON.stringify(DEFAULT_FILTERS));
    }

    // Fetch toots for the timeline from accounts the user follows as well as trending toots in
    // the fediverse, score them, and sort them.
    async getFeed(): Promise<Toot[]> {
        console.debug(`getFeed() called in fedialgo package...`);
        const response = await Promise.all(this.fetchers.map(fetcher => fetcher(this.api, this.user)));
        this.feed = response.flat();
        console.log(`Found ${this.feed.length} potential toots for feed.`);

        // Remove replies, stuff already retooted, invalid future timestamps, nulls, etc.
        let cleanFeed = this.feed.filter(isValidForFeed);
        const numRemoved = this.feed.length - cleanFeed.length;
        console.log(`Removed ${numRemoved} invalid toots (of ${this.feed.length}) leaving ${cleanFeed.length}`);

        // Remove dupes by uniquifying on the URI
        // TODO: Can a toot trend on multiple servers? If so should we total its topPost scores?
        const numValid = cleanFeed.length;
        cleanFeed = [...new Map(cleanFeed.map((toot: Toot) => [toot.uri, toot])).values()];
        console.log(`Removed ${numValid - cleanFeed.length} duplicate toots leaving ${cleanFeed.length}`);
        this.feed = cleanFeed;

        // Get all the unique languages that show up in the feed (default to English)
        this.feedLanguages = this.feed.reduce((langCounts, toot) => {
            toot.language ??= ENGLISH_CODE;
            langCounts[toot.language] = (langCounts[toot.language] || 0) + 1;
            return langCounts;
        }, {} as StringNumberDict)

        // Prepare scorers before scoring Toots (only needs to be done once (???))
        await Promise.all(this.featureScorers.map(scorer => scorer.getFeature(this.api)));
        return await this.scoreFeed(this);
    }

    // Rescores the toots in the feed. Gets called when the user changes the weightings.
    // Has side effect of updating Storage.
    async updateUserWeights(userWeights: StringNumberDict): Promise<Toot[]> {
        console.log("updateUserWeights() called with weights:", userWeights);
        await Storage.setWeightings(userWeights);
        return await this.scoreFeed(this);
    }

    async updateFilters(newFilters: FeedFilterSettings): Promise<Toot[]> {
        console.log(`updateFilters() called with newFilters: `, newFilters);
        this.filters = newFilters;
        Storage.setFilters(newFilters);
        return this.filteredFeed();
    };

    // Return the user's current weightings for each score category
    async getUserWeights(): Promise<StringNumberDict> {
        return await Storage.getWeightings();
    }

    // Filter the feed based on the user's settings. Has the side effect of calling the setFeedInApp() callback.
    filteredFeed(): Toot[] {
        const filteredFeed = this.feed.filter(toot => this.isFiltered(toot));
        this.setFeedInApp(filteredFeed);
        return filteredFeed;
    }

    list(): Paginator {
        return new Paginator(this.feed);
    }

    // Find the most recent toot in the feed
    mostRecentTootAt(): Date {
        if (this.feed.length == 0) return EARLIEST_TIMESTAMP;

        const mostRecentToot = this.feed.reduce(
            (recentToot, toot) => recentToot.createdAt > toot.createdAt ? recentToot : toot,
            this.feed[0]
        );

        return new Date(mostRecentToot.createdAt);
    };

    // Debugging method to log info about the timeline toots
    logFeedInfo() {
        const appCounts = this.feed.reduce((counts, toot) => {
            const app = toot.application?.name || "unknown";
            counts[app] = (counts[app] || 0) + 1;
            return counts;
        }, {} as StringNumberDict);

        console.debug(`feed toots posted by application counts: `, appCounts);
        console.log(`timeline toots (condensed): `, this.feed.map(condensedStatus));
    }

    // Adjust toot weights based on user's chosen slider values
    // TODO: unclear whether this is working correctly
    async learnWeights(tootScores: StringNumberDict, step = 0.001): Promise<StringNumberDict | undefined> {
        if (!this.filters.weightLearningEnabled) {
            console.debug(`learnWeights() called but weight learning is disabled...`);
            return;
        } else if (!tootScores) {
            console.debug(`learnWeights() called but tootScores arg is empty...`);
            return;
        }

        console.debug(`learnWeights() called with 'tootScores' arg: `, tootScores);

        // Compute the total and mean score (AKA 'weight') of all the posts we are weighting
        const total = Object.values(tootScores)
                            .filter((value: number) => !isNaN(value))
                            .reduce((accumulator, currentValue) => accumulator + Math.abs(currentValue), 0);

        const mean = total / Object.values(tootScores).length;
        // Compute the sum and mean of the preferred weighting configured by the user with the weight sliders
        const newTootScores: StringNumberDict = await this.getUserWeights()

        const userWeightTotal = Object.values(newTootScores)
                                   .filter((value: number) => !isNaN(value))
                                   .reduce((accumulator, currentValue) => accumulator + currentValue, 0);

        const meanUserWeight = userWeightTotal / Object.values(newTootScores).length;

        for (const key in newTootScores) {
            const reweight = 1 - (Math.abs(tootScores[key]) / mean) / (newTootScores[key] / meanUserWeight);
            newTootScores[key] = newTootScores[key] - (step * newTootScores[key] * reweight);  // TODO: this seems wrong?
        }

        await this.updateUserWeights(newTootScores);
        return newTootScores;
    }

    private async scoreFeed(self: TheAlgorithm): Promise<Toot[]> {
        const threadID = createRandomString(5);
        console.debug(`scoreFeed() [${threadID}] called in fedialgo package...`);

        try {
            // Lock a mutex to prevent multiple scoring loops to call the DiversityFeedScorer simultaneously
            self.scoreMutex.cancel()
            const releaseMutex = await self.scoreMutex.acquire();

            try {
                // TODO: DiversityFeedScorer mutates its state as it scores so setFeed() must be reset
                await Promise.all(self.feedScorers.map(scorer => scorer.setFeed(self.feed)));

                // TODO: DiversityFeedScorer mutations are problematic when used with Promise.all() so use a loop
                for (const toot of self.feed) {
                    await self.decorateWithScoreInfo(toot);
                }

                console.debug(`scoreFeed() [${threadID}] call completed successfully...`);
            } finally {
                releaseMutex();
            }
        } catch (e) {
            if (e == E_CANCELED) {
                console.debug(`scoreFeed() [${threadID}] mutex cancellation`);
            } else {
                console.warn(`scoreFeed() [${threadID}] caught error:`, e);
            }
        }

        // Sort feed based on score from high to low. This must come after the deduplication step.
        self.feed.sort((a, b) => (b.scoreInfo?.score ?? 0) - (a.scoreInfo?.score ?? 0));
        self.logFeedInfo();
        Storage.setFeed(self.feed);
        return self.filteredFeed();
    }

    // Load weightings from storage. Set defaults for any missing weightings.
    private async setDefaultWeights(): Promise<void> {
        let weightings = await Storage.getWeightings();
        let shouldSetWeights = false;

        Object.keys(this.scorersDict).forEach(key => {
            if (!weightings[key] && weightings[key] !== 0) {
                console.log(`Setting default '${key}' weight to ${this.scorersDict[key].defaultWeight}`);
                weightings[key] = this.scorersDict[key].defaultWeight;
                shouldSetWeights = true;
            }
        });

        if (shouldSetWeights) {
            await Storage.setWeightings(weightings);
        }
    }

    private isFiltered(toot: Toot): boolean {
        const languages = this.filters.filteredLanguages;
        const tootLanguage = toot.language || NO_LANGUAGE;

        if (languages.length > 0) {
            if (!languages.includes(tootLanguage)) {
                console.debug(`Removing toot ${toot.uri} w/invalid language ${tootLanguage}. valid langs:`, languages);
                return false;
            } else {
                console.debug(`Allowing toot with language ${tootLanguage}...`);
            }
        }

        if (this.filters.onlyLinks && !(toot.card || toot.reblog?.card)) {
            return false;
        } else if (toot.reblog && !this.filters.includeReposts) {
            console.debug(`Removing reblogged status ${toot.uri} from feed...`);
            return false;
        } else if (!this.filters.includeTrendingToots && toot.scoreInfo?.rawScores[TRENDING_TOOTS]) {
            return false;
        } else if (!this.filters.includeFollowedAccounts && !toot.scoreInfo?.rawScores[TRENDING_TOOTS]) {
            return false;
        } else if (!this.filters.includeReplies && toot.inReplyToId) {
            return false;
        } else if (!this.filters.includeFollowedHashtags && toot.followedTags?.length) {
            return false;
        }

        return true;
    }

    // Add scores including weighted & unweighted components to the Toot for debugging/inspection
    private async decorateWithScoreInfo(toot: Toot): Promise<void> {
        // console.debug(`decorateWithScoreInfo ${describeToot(toot)}: `, toot);
        let rawScore = 1;
        const rawScores = {} as StringNumberDict;
        const weightedScores = {} as StringNumberDict;

        const userWeights = await this.getUserWeights();
        const scores = await Promise.all(this.weightedScorers.map(scorer => scorer.score(toot)));

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
        } as TootScore;

        // If it's a retoot copy the scores to the retooted toot as well // TODO: this is janky
        if (toot.reblog) toot.reblog.scoreInfo = toot.scoreInfo;
    }

    private shouldReloadFeed(): boolean {
        const mostRecentTootAt = this.mostRecentTootAt();
        return ((Date.now() - mostRecentTootAt.getTime()) > RELOAD_IF_OLDER_THAN_MS);
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

    if (toot.filtered && toot.filtered.length > 0) {
        const filterMatch = toot.filtered[0];
        console.debug(`Removed toot that matched filter (${filterMatch.keywordMatches?.join(' ')}): `, toot);
        return false;
    }

    return true;
};


export {
    NO_LANGUAGE,
    TIME_DECAY,
    FeedFilterSettings,
    StringNumberDict,
    TheAlgorithm,
    Toot,
};
