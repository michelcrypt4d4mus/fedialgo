/*
 * Main class that handles scoring and sorting a feed made of Toot objects.
 */
import { E_CANCELED, Mutex } from 'async-mutex';
import { mastodon } from "masto";

import ChaosScorer from "./scorer/feature/chaos_scorer";
import DiversityFeedScorer from "./scorer/feed/diversity_feed_scorer";
import FollowedTagsScorer from "./scorer/feature/followed_tags_scorer";
import ImageAttachmentScorer from "./scorer/feature/image_attachment_scorer";
import InteractionsScorer from "./scorer/feature/interactions_scorer";
import MentionsFollowedScorer from './scorer/feature/mentions_followed_scorer';
import MostFavoritedAccountsScorer from "./scorer/feature/most_favorited_accounts_scorer";
import MostRepliedAccountsScorer from "./scorer/feature/most_replied_accounts_scorer";
import NumericFilter from "./filters/numeric_filter";
import NumFavoritesScorer from "./scorer/feature/num_favorites_scorer";
import NumRepliesScorer from "./scorer/feature/num_replies_scorer";
import NumRetootsScorer from "./scorer/feature/num_retoots_scorer";
import PropertyFilter, { TYPE_FILTERS, PropertyName, TypeFilterName } from "./filters/property_filter";
import RetootedUsersScorer from "./scorer/feature/retooted_users_scorer";
import RetootsInFeedScorer from "./scorer/feed/retoots_in_feed_scorer";
import Scorer from "./scorer/scorer";
import Storage from "./Storage";
import Toot, { mostRecentTootedAt, sortByCreatedAt } from './api/objects/toot';
import TrendingLinksScorer from './scorer/feature/trending_links_scorer';
import TrendingTagsScorer from "./scorer/feature/trending_tags_scorer";
import TrendingTootScorer from "./scorer/feature/trending_toots_scorer";
import VideoAttachmentScorer from "./scorer/feature/video_attachment_scorer";
import { buildAccountNames } from "./api/objects/account";
import { createRandomString, incrementCount } from "./helpers";
import { DEFAULT_WEIGHTS, buildNewFilterSettings } from "./config";
import { MastoApi } from "./api/api";
import {
    AccountNames,
    AlgorithmArgs,
    FeedFilterSettings,
    ScorerDict,
    ScorerInfo,
    StringNumberDict,
    WeightName,
    Weights,
} from "./types";

const TIME_DECAY = WeightName.TIME_DECAY;
const TRENDING = WeightName.TRENDING;


class TheAlgorithm {
    api: mastodon.rest.Client;
    user: mastodon.v1.Account;
    filters: FeedFilterSettings;

    // Variables with initial values
    feed: Toot[] = [];
    serverSideFilters: mastodon.v2.Filter[] = [];
    trendingLinks: mastodon.v1.TrendLink[] = [];
    followedAccounts: AccountNames = {};
    followedTags: StringNumberDict = {};
    mutedAccounts: AccountNames = {};
    scoreMutex = new Mutex();
    // Optional callback to set the feed in the code using this package
    setFeedInApp: (f: Toot[]) => void = (f) => console.debug(`Default setFeedInApp() called...`);

    followedTagsScorer = new FollowedTagsScorer();
    mentionsFollowedScorer = new MentionsFollowedScorer();

    // These can score a toot without knowing about the rest of the toots in the feed
    featureScorers = [
        this.followedTagsScorer,
        this.mentionsFollowedScorer,  // pulls followed accounts
        new ChaosScorer(),
        new ImageAttachmentScorer(),
        new InteractionsScorer(),
        new MostFavoritedAccountsScorer(),
        new MostRepliedAccountsScorer(),
        new NumFavoritesScorer(),
        new NumRepliesScorer(),
        new NumRetootsScorer(),
        new RetootedUsersScorer(),
        new TrendingLinksScorer(),
        new TrendingTagsScorer(),
        new TrendingTootScorer(),
        new VideoAttachmentScorer(),
    ];

    // These scorers require the complete feed to work properly
    feedScorers = [
        new DiversityFeedScorer(),
        new RetootsInFeedScorer(),
    ];

    weightedScorers = [
        ...this.featureScorers,
        ...this.feedScorers,
    ];

    scorersDict: ScorerDict = this.weightedScorers.reduce(
        (scorerInfos, scorer) => {
            scorerInfos[scorer.name] = scorer.getInfo();
            return scorerInfos;
        },
        // TimeDecay and Trending require bespoke handling so it's not included in the loop above
        {
            [TIME_DECAY]: Object.assign({}, DEFAULT_WEIGHTS[TIME_DECAY]),
            [TRENDING]: Object.assign({}, DEFAULT_WEIGHTS[TRENDING]),
        } as ScorerDict
    );

    // This is the alternate constructor() that instantiates the class and loads the feed from storage.
    static async create(params: AlgorithmArgs): Promise<TheAlgorithm> {
        await Storage.setIdentity(params.user);
        await Storage.logAppOpen();

        const algo = new TheAlgorithm(params);
        await algo.setDefaultWeights();
        algo.filters = await Storage.getFilters();
        algo.feed = await Storage.getFeed();
        console.log(`[fedialgo] create() loaded feed with ${algo.feed.length} toots`, algo.feed.slice(0, 100));
        algo.followedAccounts = buildAccountNames((await Storage.getFollowedAccts()));
        algo.extractSummaryInfo();
        algo.setFeedInApp(algo.feed);
        return algo;
    }

    private constructor(params: AlgorithmArgs) {
        this.api = params.api;
        this.user = params.user;
        this.setFeedInApp = params.setFeedInApp ?? this.setFeedInApp;
        MastoApi.init(this.api, this.user);
        this.filters = buildNewFilterSettings();
    }

    // Fetch toots from followed accounts plus trending toots in the fediverse, then score and sort them
    async getFeed(numTimelineToots?: number, maxId?: string): Promise<Toot[]> {
        console.debug(`[fedialgo] getFeed() called (numTimelineToots=${numTimelineToots}, maxId=${maxId})`);
        numTimelineToots = numTimelineToots || Storage.getConfig().numTootsInFirstFetch;
        let promises: Promise<any>[] = [MastoApi.instance.getTimelineToots(numTimelineToots, maxId)];

        // If this is the first call to getFeed(), also fetch the user's followed accounts and tags
        if (!maxId) {
            promises = promises.concat([
                MastoApi.instance.getStartupData(),
                // FeatureScorers return empty arrays; they're just here for load time parallelism
                ...this.featureScorers.map(scorer => scorer.fetchRequiredData()),
            ]);
        }

        const allResponses = await Promise.all(promises);
        console.debug(`getFeed() allResponses:`, allResponses);
        const { homeToots, otherToots } = allResponses.shift();
        const newToots = [...homeToots, ...otherToots];

        if (allResponses.length > 0) {
            const userData = allResponses.shift();
            this.mutedAccounts = userData.mutedAccounts;
            this.serverSideFilters = userData.serverSideFilters;
            // Pull followed accounts and tags from the scorers
            this.followedAccounts = buildAccountNames(this.mentionsFollowedScorer.followedAccounts);
            this.followedTags = this.followedTagsScorer.requiredData;
        }

        this.logTootCounts(newToots, homeToots);
        // Remove stuff already retooted, invalid future timestamps, nulls, etc.
        let cleanNewToots = newToots.filter(toot => toot.isValidForFeed(this));
        const numRemoved = newToots.length - cleanNewToots.length;
        console.log(`Removed ${numRemoved} invalid toots leaving ${cleanNewToots.length}`);

        const cleanFeed = Toot.dedupeToots([...this.feed, ...cleanNewToots], "getFeed");
        this.feed = cleanFeed.slice(0, Storage.getConfig().maxNumCachedToots);
        this.extractSummaryInfo();
        this.maybeGetMoreToots(homeToots, numTimelineToots);  // Called asynchronously
        return this.scoreFeed.bind(this)();
    }

    // Return the user's current weightings for each score category
    async getUserWeights(): Promise<Weights> {
        return await Storage.getWeightings();
    }

    // Update user weightings and rescore / resort the feed.
    async updateUserWeights(userWeights: Weights): Promise<Toot[]> {
        console.log("updateUserWeights() called with weights:", userWeights);
        await Storage.setWeightings(userWeights);
        return this.scoreFeed.bind(this)();
    }

    // TODO: maybe this should be a copy so edits don't happen in place?
    getFilters(): FeedFilterSettings {
        return this.filters;
    }

    updateFilters(newFilters: FeedFilterSettings): Toot[] {
        console.log(`updateFilters() called with newFilters: `, newFilters);
        this.filters = newFilters;
        Storage.setFilters(newFilters);
        return this.filterFeed();
    }

    // Filter the feed based on the user's settings. Has the side effect of calling the setFeedInApp() callback.
    filterFeed(): Toot[] {
        const filteredFeed = this.feed.filter(toot => toot.isInTimeline(this.filters));
        console.log(`filteredFeed() found ${filteredFeed.length} valid toots of ${this.feed.length}...`);
        this.setFeedInApp(filteredFeed);
        return filteredFeed;
    }

    // Debugging method to log info about the timeline toots
    logFeedInfo(prefix: string = ""): void {
        prefix = prefix.length == 0 ? prefix : `${prefix} `;
        console.log(`${prefix}timeline toots (condensed):`, this.feed.map(t => t.condensedStatus()));
        console.log(`${prefix}timeline toots filters, including counts:`, this.filters);
    }

    // Compute language, app, etc. counts.
    extractSummaryInfo(): void {
        const tootCounts = Object.values(PropertyName).reduce((counts, propertyName) => {
            // Instantiate missing filter sections  // TODO: maybe this should happen in Storage?
            this.filters.filterSections[propertyName] ??= new PropertyFilter({title: propertyName});
            counts[propertyName as PropertyName] = {} as StringNumberDict;
            return counts;
        }, {} as Record<PropertyName, StringNumberDict>);

        this.feed.forEach(toot => {
            toot.isFollowed = toot.account.acct in this.followedAccounts;     // Set isFollowed flag
            incrementCount(tootCounts[PropertyName.APP], toot.application.name);
            incrementCount(tootCounts[PropertyName.LANGUAGE], toot.language);
            incrementCount(tootCounts[PropertyName.USER], toot.account.acct);

            // Lowercase and count tags
            toot.tags.forEach((tag) => {
                toot.followedTags ??= [];  // TODO why do i need this to make typescript happy?
                if (tag.name in this.followedTags) toot.followedTags.push(tag);
                incrementCount(tootCounts[PropertyName.HASHTAG], tag.name);
            });

            // Aggregate type counts
            Object.entries(TYPE_FILTERS).forEach(([name, typeFilter]) => {
                if (typeFilter(toot)) {
                    incrementCount(tootCounts[PropertyName.TYPE], name);
                }
            });

            // Aggregate server-side filter counts
            this.serverSideFilters.forEach((filter) => {
                filter.keywords.forEach((keyword) => {
                    if (toot.containsString(keyword.keyword)) {
                        console.debug(`Matched server filter (${toot.describe()}):`, filter);
                        incrementCount(tootCounts[PropertyName.SERVER_SIDE_FILTERS], keyword.keyword);
                    }
                });
            });
        });

        // TODO: if there's a validValues element for a filter section that is no longer in the feed
        // the user will not be presented with the option to turn it off. This is a bug.
        Object.entries(tootCounts).forEach(([propertyName, counts]) => {
            this.filters.filterSections[propertyName as PropertyName].setOptions(counts);
        });

        Storage.setFilters(this.filters);
        console.debug(`repairFeedAndExtractSummaryInfo() completed, built filters:`, this.filters);
    }

    mostRecentTootAt(): Date | null {
        return mostRecentTootedAt(this.feed);
    }

    // Asynchronously fetch more toots if we have not reached the requred # of toots
    // and the last request returned the full requested count
    private async maybeGetMoreToots(newHomeToots: Toot[], numTimelineToots: number): Promise<void> {
        const maxTimelineTootsToFetch = Storage.getConfig().maxTimelineTootsToFetch;
        console.log(`Have ${this.feed.length} toots in timeline, want ${maxTimelineTootsToFetch}...`);

        // Stop if we have enough toots or the last request didn't return the full requested count (minus 2)
        if (
               Storage.getConfig().enableIncrementalLoad
            && this.feed.length < maxTimelineTootsToFetch
            && newHomeToots.length >= (numTimelineToots - 3)  // Sometimes we get 39 records instead of 40 at a time
        ) {
            setTimeout(
                () => {
                    // Use the 5th toot bc sometimes there are weird outliers. Dupes will be removed later.
                    // It's important that we *only* look at home timeline toots here. Toots from other servers
                    // will have different ID schemes and we can't rely on them to be in order.
                    const tootWithMaxId = sortByCreatedAt(newHomeToots)[5];
                    console.log(`calling getFeed() recursively current newHomeToots:`, newHomeToots);
                    this.getFeed(numTimelineToots, tootWithMaxId.id);
                },
                Storage.getConfig().incrementalLoadDelayMS
            );
        } else {
            if (!Storage.getConfig().enableIncrementalLoad) {
                console.log(`halting getFeed(): incremental loading disabled`);
            } else if (this.feed.length >= maxTimelineTootsToFetch) {
                console.log(`halting getFeed(): we have ${this.feed.length} toots`);
            } else {
                console.log(`halting getFeed(): fetch only got ${newHomeToots.length} toots (expected ${numTimelineToots})`);
            }
        }
    }

    // Load weightings from storage. Set defaults for any missing weightings.
    private async setDefaultWeights(): Promise<void> {
        let weightings = await Storage.getWeightings();
        let shouldSetWeights = false;

        Object.keys(this.scorersDict).forEach((key) => {
            const value = weightings[key as WeightName];

            if (!value && value !== 0) {
                weightings[key as WeightName] = this.scorersDict[key as WeightName].defaultWeight;
                shouldSetWeights = true;
            }
        });

        // If any changes were made to the Storage weightings, save them back to storage
        if (shouldSetWeights) await Storage.setWeightings(weightings);
    }

    // Injecting the scoreInfo property to each toot. Sort feed based on toot scores.
    private async scoreFeed(): Promise<Toot[]> {
        const logPrefix = `scoreFeed() [${createRandomString(5)}]`;
        console.debug(`${logPrefix} called in fedialgo package...`);

        try {
            // Lock a mutex to prevent multiple scoring loops to call the DiversityFeedScorer simultaneously
            this.scoreMutex.cancel()
            const releaseMutex = await this.scoreMutex.acquire();

            try {
                // TODO: DiversityFeedScorer mutates its state as it scores so setFeed() must be reset
                let promises: any[] = this.feedScorers.map(scorer => scorer.setFeed(this.feed));

                if (!this.featureScorers.every(scorer => scorer.isReady)) {
                    console.warn(`For some reasons FeaturesScorers are not ready. Making it so...`);
                    promises = promises.concat(this.featureScorers.map(scorer => scorer.fetchRequiredData()));
                }

                await Promise.all(promises);

                // TODO: DiversityFeedScorer mutations are problematic when used with Promise.all() so use a loop
                for (const toot of this.feed) {
                    await Scorer.decorateWithScoreInfo(toot, this.weightedScorers);
                }

                // Sort feed based on score from high to low.
                this.feed.sort((a, b) => (b.scoreInfo?.score ?? 0) - (a.scoreInfo?.score ?? 0));
                this.logFeedInfo(logPrefix);
                Storage.setFeed(this.feed);
            } finally {
                releaseMutex();
            }
        } catch (e) {
            if (e == E_CANCELED) {
                console.debug(`${logPrefix} mutex cancellation`);
            } else {
                console.warn(`${logPrefix} caught error:`, e);
            }
        }

        return this.filterFeed();
    }

    // Utility method to log progress of getFeed() calls
    private logTootCounts(newToots: Toot[], newHomeToots: Toot[]) {
        let msg = `Got ${Object.keys(this.followedAccounts).length} followed accounts, ${newToots.length} new toots`;
        msg += `, ${newHomeToots.length} new home toots, ${newToots.length} total new toots, this.feed has ${this.feed.length} toots`;
        console.log(msg);
    }

    // Adjust toot weights based on user's chosen slider values
    // TODO: unclear whether this is working correctly
    async learnWeights(tootScores: Weights, step = 0.001): Promise<Weights | undefined> {
        console.debug(`learnWeights() called with 'tootScores' arg but is not implemented`, tootScores);
        return;

        // if (!this.filters.weightLearningEnabled) {
        if (true) {
            console.debug(`learnWeights() called but weight learning is disabled...`);
            return;
        } else if (!tootScores) {
            console.debug(`learnWeights() called but tootScores arg is empty...`);
            return;
        }

        // Compute the total and mean score (AKA 'weight') of all the posts we are weighting
        const total = Object.values(tootScores)
                            .filter((value) => !isNaN(value))
                            .reduce((accumulator, currentValue) => accumulator + Math.abs(currentValue), 0);
        const mean = total / Object.values(tootScores).length;

        // Compute the sum and mean of the preferred weighting configured by the user with the weight sliders
        const newTootScores = await this.getUserWeights()
        const userWeightTotal = Object.values(newTootScores)
                                   .filter((value: number) => !isNaN(value))
                                   .reduce((accumulator, currentValue) => accumulator + currentValue, 0);
        const meanUserWeight = userWeightTotal / Object.values(newTootScores).length;

        for (let key in newTootScores) {
            const reweight = 1 - (Math.abs(tootScores[key as WeightName]) / mean) / (newTootScores[key as WeightName] / meanUserWeight);
            newTootScores[key as WeightName] = newTootScores[key as WeightName] - (step * newTootScores[key as WeightName] * reweight);  // TODO: this seems wrong?
        }

        await this.updateUserWeights(newTootScores);
        return newTootScores;
    }
};


// Export types and constants needed by apps using this package
export {
    TIME_DECAY,
    TRENDING,
    FeedFilterSettings,
    NumericFilter,
    PropertyFilter,
    PropertyName,
    ScorerInfo,
    StringNumberDict,
    TheAlgorithm,
    Toot,
    TypeFilterName,
    WeightName,
    Weights,
};
