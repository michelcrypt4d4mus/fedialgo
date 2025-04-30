/*
 * Main class that handles scoring and sorting a feed made of Toot objects.
 */
import { E_CANCELED, Mutex } from 'async-mutex';
import { mastodon } from "masto";

import Account from './api/objects/account';
import ChaosScorer from "./scorer/feature/chaos_scorer";
import DiversityFeedScorer from "./scorer/feed/diversity_feed_scorer";
import FollowedTagsScorer from "./scorer/feature/followed_tags_scorer";
import ImageAttachmentScorer from "./scorer/feature/image_attachment_scorer";
import InteractionsScorer from "./scorer/feature/interactions_scorer";
import MastodonServer from './api/mastodon_server';
import MentionsFollowedScorer from './scorer/feature/mentions_followed_scorer';
import MostFavoritedAccountsScorer from "./scorer/feature/most_favorited_accounts_scorer";
import MostRepliedAccountsScorer from "./scorer/feature/most_replied_accounts_scorer";
import MostRetootedUsersScorer from "./scorer/feature/most_retooted_users_scorer";
import NumericFilter from "./filters/numeric_filter";
import NumFavoritesScorer from "./scorer/feature/num_favorites_scorer";
import NumRepliesScorer from "./scorer/feature/num_replies_scorer";
import NumRetootsScorer from "./scorer/feature/num_retoots_scorer";
import PropertyFilter, { PropertyName, TypeFilterName } from "./filters/property_filter";
import RetootsInFeedScorer from "./scorer/feature/retoots_in_feed_scorer";
import Scorer from "./scorer/scorer";
import Storage from "./Storage";
import Toot, { earliestTootedAt, mostRecentTootedAt, sortByCreatedAt } from './api/objects/toot';
import TrendingLinksScorer from './scorer/feature/trending_links_scorer';
import TrendingTagsScorer from "./scorer/feature/trending_tags_scorer";
import TrendingTootScorer from "./scorer/feature/trending_toots_scorer";
import VideoAttachmentScorer from "./scorer/feature/video_attachment_scorer";
import { buildNewFilterSettings, initializeFiltersWithSummaryInfo } from "./filters/feed_filters";
import { DEFAULT_WEIGHTS } from './scorer/weight_presets';
import { GIFV, VIDEO_TYPES, extractDomain } from './helpers/string_helpers';
import { MastoApi } from "./api/api";
import { PresetWeightLabel, PresetWeights } from './scorer/weight_presets';
import { processPromisesBatch } from './helpers/collection_helpers';
import { SCORERS_CONFIG } from "./config";
import { toISOFormat } from './helpers/time_helpers';
import {
    FeedFilterSettings,
    MastodonServersInfo,
    MediaCategory,
    ScorerDict,
    ScorerInfo,
    StringNumberDict,
    TrendingLink,
    TrendingObj,
    TrendingStorage,
    TrendingTag,
    TrendingWithHistory,
    WeightName,
    Weights,
} from "./types";

interface AlgorithmArgs {
    api: mastodon.rest.Client;
    user: mastodon.v1.Account;
    setFeedInApp?: (feed: Toot[]) => void;  // Optional callback to set the feed in the code using this package
};


class TheAlgorithm {
    // Variables set in the constructor
    api: mastodon.rest.Client;
    user: mastodon.v1.Account;
    filters: FeedFilterSettings;
    setFeedInApp: (feed: Toot[]) => void;  // Optional callback to set the feed in the app using this package

    // Variables with initial values
    feed: Toot[] = [];
    catchupCheckpoint: Date | null = null;  // If doing a catch up refresh load we need to get back to this timestamp
    loadingStatus?: string = "(ready to load)";  // String describing load activity (undefined means load complete)
    mastodonServers: MastodonServersInfo = {};
    scoreMutex = new Mutex();
    trendingData: TrendingStorage = {links: [], tags: [], toots: []};

    // These can score a toot without knowing about the rest of the toots in the feed
    featureScorers = [
        new ChaosScorer(),
        new FollowedTagsScorer(),
        new MentionsFollowedScorer(),
        new ImageAttachmentScorer(),
        new InteractionsScorer(),
        new MostFavoritedAccountsScorer(),
        new MostRepliedAccountsScorer(),
        new MostRetootedUsersScorer(),
        new NumFavoritesScorer(),
        new NumRepliesScorer(),
        new NumRetootsScorer(),
        new RetootsInFeedScorer(),
        new TrendingLinksScorer(),
        new TrendingTagsScorer(),
        new TrendingTootScorer(),
        new VideoAttachmentScorer(),
    ];

    // These scorers require the complete feed to work properly
    feedScorers = [
        new DiversityFeedScorer(),
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
        // TimeDecay and Trending require bespoke handling so they aren't included in the loop above
        {
            [WeightName.TIME_DECAY]: Object.assign({}, SCORERS_CONFIG[WeightName.TIME_DECAY]),
            [WeightName.TRENDING]: Object.assign({}, SCORERS_CONFIG[WeightName.TRENDING]),
        } as ScorerDict
    );

    // This is the alternate constructor() that instantiates the class and loads the feed from storage.
    static async create(params: AlgorithmArgs): Promise<TheAlgorithm> {
        const user = new Account(params.user);
        await Storage.setIdentity(user);
        await Storage.logAppOpen();

        // Construct the algorithm object, set the default weights, load feed and filters
        const algo = new TheAlgorithm({api: params.api, user: user, setFeedInApp: params.setFeedInApp});
        await algo.setDefaultWeights();
        algo.feed = await Storage.getFeed();
        algo.setFeedInApp(algo.feed);
        algo.filters = await Storage.getFilters();
        algo.trendingData = await Storage.getTrending();
        console.log(`[fedialgo] create() loaded ${algo.feed.length} timeline toots from storage...`);
        return algo;
    }

    private constructor(params: AlgorithmArgs) {
        this.api = params.api;
        this.user = params.user;
        this.setFeedInApp = params.setFeedInApp ?? ((f: Toot[]) => console.debug(`Default setFeedInApp() called`));
        MastoApi.init(this.api, this.user as Account);
        this.filters = buildNewFilterSettings();
    }

    // Fetch toots from followed accounts plus trending toots in the fediverse, then score and sort them
    // TODO: this will stop pulling toots before it fills in the gap back to the last of the user's actual timeline toots.
    async getFeed(numTimelineToots?: number, maxId?: string): Promise<Toot[]> {
        console.debug(`[fedialgo] getFeed() called (numTimelineToots=${numTimelineToots}, maxId=${maxId})`);
        numTimelineToots = numTimelineToots || Storage.getConfig().numTootsInFirstFetch;

        // ORDER MATTERS! The results of these Promises are processed with shift()
        let dataFetches: Promise<any>[] = [
            MastoApi.instance.fetchHomeFeed(numTimelineToots, maxId),
            MastoApi.instance.getUserData(),
        ];

        // If this is the first call to getFeed() also fetch the UserData (followed accts, blocks, etc.)
        if (!maxId) {
            // If getFeed() is called with no maxId and no toots in the feed then it's an initial load.
            if (!this.feed.length) {
                this.loadingStatus = "initial data";
            // Otherwise if there's no maxId but there is already an existing feed array that means it's a refresh
            } else if (this.feed.length) {
                this.catchupCheckpoint = this.mostRecentTootAt(true);
                console.log(`Set catchupCheckpoint to ${toISOFormat(this.catchupCheckpoint)} (${this.feed.length} in feed)`);
                this.loadingStatus = `any new toots back to ${toISOFormat(this.catchupCheckpoint)}`;
            }

            // ORDER MATTERS! The results of these Promises are processed with shift()
            // TODO: should we really make the user wait for the initial load to get all trending toots?
            dataFetches = dataFetches.concat([
                MastodonServer.fediverseTrendingToots(),
                MastoApi.instance.fetchRecentTootsForTrendingTags(),
                ...this.featureScorers.map(scorer => scorer.fetchRequiredData()),
            ]);
        } else {
            this.loadingStatus = `more toots (retrieved ${this.feed.length} so far)`;
        }

        const allResponses = await Promise.all(dataFetches);
        const newHomeToots = allResponses.shift();  // pop getTimelineToots() response from front of allResponses array
        const userData = allResponses.shift();
        const trendingToots = allResponses.length ? allResponses.shift().concat(allResponses.shift()) : [];
        const retrievedToots = [...newHomeToots, ...trendingToots];
        this.logTootCounts(retrievedToots, newHomeToots);

        // trendingData and mastodonServers should be getting loaded from cached data in local storage
        // as the initial fetch happened in the course of getting the trending toots.
        this.trendingData = await MastodonServer.getTrendingData();
        this.mastodonServers = await MastodonServer.getMastodonServersInfo();
        // Filter out dupe/invalid toots, build filters
        this.feed = this.cleanupFeed(retrievedToots);
        this.filters = initializeFiltersWithSummaryInfo(this.feed, userData);

        // Potentially fetch more toots if we haven't reached the desired number
        this.maybeGetMoreToots(newHomeToots, numTimelineToots);  // Called asynchronously
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

    // Update user weightings to one of the preset values and rescore / resort the feed.
    async updateUserWeightsToPreset(presetName: PresetWeightLabel): Promise<Toot[]> {
        console.log("updateUserWeightsToPreset() called with presetName:", presetName);
        return await this.updateUserWeights(PresetWeights[presetName]);
    }

    updateFilters(newFilters: FeedFilterSettings): Toot[] {
        console.log(`updateFilters() called with newFilters:`, newFilters);
        this.filters = newFilters;
        Storage.setFilters(newFilters);
        return this.filterFeed();
    }

    // If followedUsersOnly is true, return the most recent toot from followed accounts
    // Otherwise return the most recent toot from all toots in the feed
    mostRecentTootAt(followedUsersOnly?: boolean): Date | null {
        const toots = followedUsersOnly ? this.feed.filter(toot => toot.isFollowed) : this.feed;
        return mostRecentTootedAt(toots);
    }

    // Return the URL for a given tag on the local server
    buildTagURL(tag: mastodon.v1.Tag): string {
        return `https://${MastoApi.instance.homeDomain}/tags/${tag.name}`;
    }

    // Remove invalid and duplicate toots
    private cleanupFeed(toots: Toot[]): Toot[] {
        const cleanNewToots = toots.filter(toot => toot.isValidForFeed());
        const numRemoved = toots.length - cleanNewToots.length;
        if (numRemoved > 0) console.log(`Removed ${numRemoved} invalid toots leaving ${cleanNewToots.length}`);
        return Toot.dedupeToots([...this.feed, ...cleanNewToots], "getFeed");
    }

    // Filter the feed based on the user's settings. Has the side effect of calling the setFeedInApp() callback.
    private filterFeed(): Toot[] {
        const filteredFeed = this.feed.filter(toot => toot.isInTimeline(this.filters));
        console.debug(`filteredFeed() found ${filteredFeed.length} valid toots of ${this.feed.length}...`);
        this.setFeedInApp(filteredFeed);
        return filteredFeed;
    }

    // Asynchronously fetch more toots if we have not reached the requred # of toots
    // and the last request returned the full requested count
    private async maybeGetMoreToots(newHomeToots: Toot[], numTimelineToots: number): Promise<void> {
        const maxTimelineTootsToFetch = Storage.getConfig().maxTimelineTootsToFetch;
        const checkpointStr = toISOFormat(this.catchupCheckpoint);
        const earliestNewHomeTootAt = earliestTootedAt(newHomeToots);
        console.log(`[maybeGetMoreToots] TL has ${this.feed.length} toots, want ${maxTimelineTootsToFetch} (catchupCheckpoint='${checkpointStr}')`);

        // Stop if we have enough toots or the last request didn't return the full requested count (minus 2)
        if (
               Storage.getConfig().enableIncrementalLoad  // TODO: we don't need this config option any more
            && (
                   // Check newHomeToots is bigger than (numTimelineToots - 3) bc sometimes we get e.g. 39 records instead of 40
                   // but if we got like, 5 toots, that means we've exhausted the user's timeline and there's nothing more to fetch
                   (this.feed.length < maxTimelineTootsToFetch && newHomeToots.length >= (numTimelineToots - 3))
                   // Alternatively check if the earliest new home toot is newer than the catchup checkpoint. If it is
                   // we should continue fetching more toots.
                || (this.catchupCheckpoint && earliestNewHomeTootAt && earliestNewHomeTootAt > this.catchupCheckpoint)
            )
        ) {
            setTimeout(
                () => {
                    // Use the 4th toot bc sometimes there are weird outliers. Dupes will be removed later.
                    // It's important that we *only* look at home timeline toots here. Toots from other servers
                    // will have different ID schemes and we can't rely on them to be in order.
                    const tootWithMaxId = sortByCreatedAt(newHomeToots)[4];
                    let msg = `calling getFeed() recursively, current catchupCheckpoint: '${toISOFormat(this.catchupCheckpoint)}'`;
                    console.debug(`${msg}, current newHomeToots:`, newHomeToots);
                    this.getFeed(numTimelineToots, tootWithMaxId.id);
                },
                Storage.getConfig().incrementalLoadDelayMS
            );
        } else {
            const logPrefx = `[maybeGetMoreToots() - halting getFeed()]`;
            const earliestAtStr = `(earliestNewHomeTootAt '${toISOFormat(earliestNewHomeTootAt)}')`;

            if (!Storage.getConfig().enableIncrementalLoad) {
                console.log(`${logPrefx} incremental loading disabled`);
            } else if (this.catchupCheckpoint) {
                if (earliestNewHomeTootAt && earliestNewHomeTootAt < this.catchupCheckpoint) {
                    console.log(`${logPrefx} caught up to catchupCheckpoint '${checkpointStr}' ${earliestAtStr}`);
                    this.catchupCheckpoint = null;
                } else {
                    console.warn(`Not caught up to catchupCheckpoint '${checkpointStr}' ${earliestAtStr}`);
                }
            } else if (this.feed.length >= maxTimelineTootsToFetch) {
                console.log(`${logPrefx} we have ${this.feed.length} toots`);
            } else {
                console.log(`${logPrefx} fetch only got ${newHomeToots.length} toots (expected ${numTimelineToots})`);
            }

            this.loadingStatus = undefined;
        }
    }

    // Load weightings from storage. Set defaults for any missing weightings.
    private async setDefaultWeights(): Promise<void> {
        let weightings = await Storage.getWeightings();
        let shouldSetWeights = false;

        Object.keys(this.scorersDict).forEach((key) => {
            const value = weightings[key as WeightName];

            if (!value && value !== 0) {
                weightings[key as WeightName] = DEFAULT_WEIGHTS[key as WeightName];
                shouldSetWeights = true;
            }
        });

        // If any changes were made to the Storage weightings, save them back to storage
        if (shouldSetWeights) await Storage.setWeightings(weightings);
    }

    // Inject scoreInfo property to each Toot, sort feed based on scores, and save feed to browser storage.
    private async scoreFeed(): Promise<Toot[]> {
        const logPrefix = `scoreFeed()`;
        console.debug(`${logPrefix} called (${this.feed.length} toots currently in feed)...`);

        try {
            // Lock a mutex to prevent multiple scoring loops to call the DiversityFeedScorer simultaneously
            this.scoreMutex.cancel()
            const releaseMutex = await this.scoreMutex.acquire();

            try {
                // Feed scorers' data must be refreshed each time the feed changes
                this.feedScorers.forEach(scorer => scorer.extractScoreDataFromFeed(this.feed));

                await processPromisesBatch(
                    this.feed,
                    Storage.getConfig().scoringBatchSize,
                    async (toot: Toot) => await Scorer.decorateWithScoreInfo(toot, this.weightedScorers)
                );

                // Sort feed based on score from high to low.
                this.feed.sort((a, b) => (b.scoreInfo?.score ?? 0) - (a.scoreInfo?.score ?? 0));
                this.feed = this.feed.slice(0, Storage.getConfig().maxNumCachedToots);
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
    private logTootCounts(toots: Toot[], newHomeToots: Toot[]): void {
        const numFollowedAccts = Object.keys(MastoApi.instance.userData?.followedAccounts || []).length;

        let msg = [
            `Got ${toots.length} new toots from ${numFollowedAccts} followed accts`,
            `${newHomeToots.length} new home toots`,
            `${toots.length} total new toots`,
            `this.feed has ${this.feed.length} toots`,
        ];

        console.log(msg.join(', '));
    }
};


// Export types and constants needed by apps using this package
export {
    GIFV,
    VIDEO_TYPES,
    Account,
    FeedFilterSettings,
    MediaCategory,
    NumericFilter,
    PresetWeightLabel,
    PresetWeights,
    PropertyFilter,
    PropertyName,
    ScorerInfo,
    StringNumberDict,
    TheAlgorithm,
    Toot,
    TrendingLink,
    TrendingObj,
    TrendingTag,
    TrendingWithHistory,
    TypeFilterName,
    WeightName,
    Weights,
    extractDomain,
};
