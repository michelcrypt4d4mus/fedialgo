/*
 * Main class that handles scoring and sorting a feed made of Toot objects.
 */
import { capitalCase } from "change-case";
import { mastodon } from "masto";
import { Mutex } from 'async-mutex';

import Account from './api/objects/account';
import ChaosScorer from "./scorer/feature/chaos_scorer";
import DiversityFeedScorer from "./scorer/feed/diversity_feed_scorer";
import FollowedTagsScorer from "./scorer/feature/followed_tags_scorer";
import HashtagParticipationScorer from "./scorer/feature/hashtag_participation_scorer";
import ImageAttachmentScorer from "./scorer/feature/image_attachment_scorer";
import InteractionsScorer from "./scorer/feature/interactions_scorer";
import MastoApi from "./api/api";
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
import UserData from "./api/user_data";
import VideoAttachmentScorer from "./scorer/feature/video_attachment_scorer";
import { buildNewFilterSettings, initializeFiltersWithSummaryInfo } from "./filters/feed_filters";
import { lockMutex, logAndThrowError, logInfo } from './helpers/log_helpers';
import { DEFAULT_WEIGHTS } from './scorer/weight_presets';
import { filterWithLog, keyByProperty, truncateToConfiguredLength } from "./helpers/collection_helpers";
import { getMoarData, MOAR_DATA_PREFIX } from "./api/poller";
import { getParticipatedHashtagToots, getRecentTootsForTrendingTags } from "./feeds/hashtags";
import { GIFV, TELEMETRY, VIDEO_TYPES, extractDomain } from './helpers/string_helpers';
import { PresetWeightLabel, PresetWeights } from './scorer/weight_presets';
import { SCORERS_CONFIG } from "./config";
import { timeString, quotedISOFmt, ageInSeconds, inSeconds, toISOFormat } from './helpers/time_helpers';
import {
    FeedFilterSettings,
    MastodonInstances,
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

const GET_FEED_BUSY_MSG = `called while load is still in progress. Consider using the setFeedInApp() callback.`
const INITIAL_STATUS_MSG = "(ready to load)"
const CLEANUP_FEED = "cleanupFeed()";
const GET_FEED = "getFeed()";

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
    hasProvidedAnyTootsToClient = false;  // Flag to indicate if the feed has been set in the app
    lastLoadTimeInSeconds: number | null = null;  // Duration of the last load in seconds
    loadStartedAt: Date | null = null;  // Timestamp of when the feed started loading
    // TODO: loadingStatus has become sort of the main flag for whether the feed is loading or not. We should probably
    // TODO: not use a string like this.
    loadingStatus: string | null = INITIAL_STATUS_MSG;  // String describing load activity (undefined means load complete)
    mastodonServers: MastodonInstances = {};
    mergeMutex = new Mutex();
    moarMutex = new Mutex();
    scoreMutex = new Mutex();
    trendingData: TrendingStorage = {links: [], tags: [], toots: []};
    userData: UserData = new UserData();
    dataPoller?: ReturnType<typeof setInterval>;

    // These can score a toot without knowing about the rest of the toots in the feed
    featureScorers = [
        new ChaosScorer(),
        new FollowedTagsScorer(),
        new HashtagParticipationScorer(),
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
        await algo.loadCachedData();
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
        logInfo(GET_FEED, `(numTimelineToots=${numTimelineToots}, maxId=${maxId}), state:`, this.statusDict());

        if (!maxId && !numTimelineToots && this.loadingStatus && this.loadingStatus != INITIAL_STATUS_MSG) {
            logAndThrowError(`${GET_FEED} ${GET_FEED_BUSY_MSG}`);
        }

        numTimelineToots ??= Storage.getConfig().numTootsInFirstFetch;

        // If this is the first call to getFeed() also fetch the UserData (followed accts, blocks, etc.)
        if (!maxId) {
            // If getFeed() is called with no maxId and no toots in the feed then it's an initial load.
            if (!this.feed.length) {
                this.loadingStatus = "initial data";
            // Otherwise if there's no maxId but there is already an existing feed array that means it's a refresh
            } else {
                this.catchupCheckpoint = this.mostRecentHomeTootAt();
                this.loadingStatus = `new toots since ${timeString(this.catchupCheckpoint)}`;
                console.info(`${GET_FEED} Set catchupCheckpoint marker. Current state:`, this.statusDict());
            }

            // These are all calls we should only make in the initial load (all called asynchronously)
            this.loadStartedAt = new Date();
            this.prepareScorers();
            // TODO: consider waiting until after 100 or so toots have been loaded to launch these pulls
            this.mergePromisedTootsIntoFeed(MastodonServer.fediverseTrendingToots(), "fediverseTrendingToots");
            this.mergePromisedTootsIntoFeed(getRecentTootsForTrendingTags(), "getRecentTootsForTrendingTags");
            this.mergePromisedTootsIntoFeed(getParticipatedHashtagToots(), "participatedHashtagToots");
            MastodonServer.getMastodonInstancesInfo().then((servers) => this.mastodonServers = servers);
            MastodonServer.getTrendingData().then((trendingData) => this.trendingData = trendingData);
            MastoApi.instance.getUserData().then((userData) => this.userData = userData);
        } else {
            this.loadingStatus = this.loadingMoreTootsStatusMsg();;
        }

        this.mergePromisedTootsIntoFeed(MastoApi.instance.fetchHomeFeed(numTimelineToots, maxId), "fetchHomeFeed")
            .then((newToots) => {
                let msg = `fetchHomeFeed got ${newToots.length} new home timeline toots, ${this.homeTimelineToots().length}`;
                msg += ` total home TL toots so far ${inSeconds(this.loadStartedAt)}. Calling maybeGetMoreToots()...`;
                logInfo(GET_FEED, msg);
                this.maybeGetMoreToots(newToots, numTimelineToots || Storage.getConfig().numTootsInFirstFetch);
            });

        // TODO: Return is here for devs using Fedialgo but it's not well thought out (demo app uses setFeedInApp())
        return this.scoreAndFilterFeed();
    }

    // Return the user's current weightings for each score category
    async getUserWeights(): Promise<Weights> {
        return await Storage.getWeightings();
    }

    // Update the feed filters and return the newly filtered feed
    updateFilters(newFilters: FeedFilterSettings): Toot[] {
        console.log(`updateFilters() called with newFilters:`, newFilters);
        this.filters = newFilters;
        Storage.setFilters(newFilters);
        return this.setFilteredFeedInApp();
    }

    // Update user weightings and rescore / resort the feed.
    async updateUserWeights(userWeights: Weights): Promise<Toot[]> {
        console.log("updateUserWeights() called with weights:", userWeights);
        await Storage.setWeightings(userWeights);
        return this.scoreAndFilterFeed();
    }

    // Update user weightings to one of the preset values and rescore / resort the feed.
    async updateUserWeightsToPreset(presetName: PresetWeightLabel): Promise<Toot[]> {
        console.log("updateUserWeightsToPreset() called with presetName:", presetName);
        return await this.updateUserWeights(PresetWeights[presetName]);
    }

    // Clear everything from browser storage except the user's identity and weightings
    async reset(): Promise<void> {
        console.warn(`reset() called, clearing all storage...`);
        this.hasProvidedAnyTootsToClient = false;
        this.loadingStatus = INITIAL_STATUS_MSG;
        this.loadStartedAt = null;
        this.mastodonServers = {};
        this.catchupCheckpoint = null;
        this.dataPoller && clearInterval(this.dataPoller!);
        await Storage.clearAll();
        await this.loadCachedData();
    }

    // Return the timestamp of the most recent toot from followed accounts ONLY
    mostRecentHomeTootAt(): Date | null {
        return mostRecentTootedAt(this.homeTimelineToots());
    }

    homeTimelineToots(): Toot[] {
        return this.feed.filter(toot => toot.isFollowed);
    }

    // Filter the feed based on the user's settings.
    private filteredFeed(): Toot[] {
        return this.feed.filter(toot => toot.isInTimeline(this.filters));
    }

    // Filter the feed based on the user's settings. Has the side effect of calling the setFeedInApp() callback
    // that will send the client using this library the filtered subset of Toots (this.feed will always maintain
    // the master timeline).
    private setFilteredFeedInApp(): Toot[] {
        const filteredFeed = this.filteredFeed();
        this.setFeedInApp(filteredFeed);

        if (!this.hasProvidedAnyTootsToClient) {
            this.hasProvidedAnyTootsToClient = true;
            logInfo(TELEMETRY, `First ${filteredFeed.length} toots sent to client ${inSeconds(this.loadStartedAt)}`);
        }

        return filteredFeed;
    }

    // Launch the poller, force scorers to recompute data, rescore the feed
    private async checkForMoarData(): Promise<void> {
        const shouldContinue = await getMoarData();
        await this.userData.populate();
        await this.prepareScorers(true);
        await this.scoreAndFilterFeed();

        if (!shouldContinue) {
            console.log(`${MOAR_DATA_PREFIX} stopping data poller...`);
            this.dataPoller && clearInterval(this.dataPoller!);
        }
    }

    // Load cached data from storage. This is called when the app is first opened and when reset() is called.
    private async loadCachedData(): Promise<void> {
        this.feed = (await Storage.getFeed()) ?? [];
        this.filters = await Storage.getFilters();
        this.trendingData = await Storage.getTrending();
        this.setFeedInApp(this.feed);
        console.log(`[fedialgo] loaded ${this.feed.length} timeline toots from cache, trendingData:`, this.trendingData);
    }

    // Asynchronously fetch more toots if we have not reached the requred # of toots
    // and the last request returned the full requested count
    private async maybeGetMoreToots(newHomeToots: Toot[], numTimelineToots: number): Promise<void> {
        const maxInitialTimelineToots = Storage.getConfig().maxInitialTimelineToots;
        const earliestNewHomeTootAt = earliestTootedAt(newHomeToots);
        let logPrefix = `[maybeGetMoreToots()]`;

        // Stop if we have enough toots or the last request didn't return the full requested count (minus 2)
        if (
               Storage.getConfig().enableIncrementalLoad  // TODO: we don't need this config option any more
            && (
                   // Check newHomeToots is bigger than (numTimelineToots - 3) bc sometimes we get e.g. 39 records instead of 40
                   // but if we got like, 5 toots, that means we've exhausted the user's timeline and there's nothing more to fetch
                   (this.feed.length < maxInitialTimelineToots && newHomeToots.length >= (numTimelineToots - 3))
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
                    let msg = `Calling ${GET_FEED} recursively, newHomeToots has ${newHomeToots.length} toots`;
                    msg += `(want ${maxInitialTimelineToots})`;
                    console.log(`${logPrefix} ${msg}. state:`, this.statusDict());
                    this.getFeed(numTimelineToots, tootWithMaxId.id);
                },
                Storage.getConfig().incrementalLoadDelayMS
            );
        } else {
            logPrefix += ` Halting ${GET_FEED}:`;

            if (!Storage.getConfig().enableIncrementalLoad) {
                console.log(`${logPrefix} Incremental loading is fully disabled`);
            } else if (this.catchupCheckpoint) {
                if (earliestNewHomeTootAt && earliestNewHomeTootAt < this.catchupCheckpoint) {
                    let tmpCheckpoint = this.catchupCheckpoint;
                    this.catchupCheckpoint = null;
                    let msg = `${logPrefix} all caught up: oldest new toot ${quotedISOFmt(earliestNewHomeTootAt)}`;
                    console.log(`${msg} older than checkpoint ${quotedISOFmt(tmpCheckpoint)}. state:`, this.statusDict());
                } else {
                    console.warn(`${logPrefix} but NOT caught up to catchupCheckpoint! state:`, this.statusDict());
                }
            } else if (this.feed.length >= maxInitialTimelineToots) {
                console.log(`${logPrefix} have enough toots (wanted ${maxInitialTimelineToots}), state:`, this.statusDict());
            } else {
                let msg = `${logPrefix} stopping because fetch only got ${newHomeToots.length} toots`;
                console.log(`${msg}, expected ${numTimelineToots}. state:`, this.statusDict());
            }

            if (this.loadStartedAt) {
                logInfo(TELEMETRY, `Finished home TL load w/ ${this.feed.length} toots ${inSeconds(this.loadStartedAt)}`);
                this.lastLoadTimeInSeconds = ageInSeconds(this.loadStartedAt);
                this.loadStartedAt = null;
            } else {
                this.lastLoadTimeInSeconds = null;
                console.warn(`[${TELEMETRY}] FINISHED LOAD... but loadStartedAt is null!`);
            }

            // set dataPoller to null later to make it clear it's done
            if (!this.dataPoller) {
                console.log(`${logPrefix} starting data poller...`);

                this.dataPoller = setInterval(
                    () => this.checkForMoarData(),
                    Storage.getConfig().backgroundLoadIntervalMS
                );
            } else {
                console.log(`${logPrefix} not launching data poller bc... already running?`, this.dataPoller);
            }

            this.loadingStatus = null;
        }
    }

    private loadingMoreTootsStatusMsg(): string {
        let msg = `more toots (retrieved ${this.feed.length.toLocaleString()} toots so far`;

        if (this.feed.length < Storage.getConfig().maxInitialTimelineToots) {
            msg += `, want ${Storage.getConfig().maxInitialTimelineToots.toLocaleString()}`;
        }

        return msg + ')'
    }

    // Merge a new batch of toots into the feed. Returns whatever toots are retrieve by tooFetcher
    private async mergePromisedTootsIntoFeed(tootFetcher: Promise<Toot[]>, label: string): Promise<Toot[]> {
        const logPrefix = `mergeTootsIntoFeed() ${label}`;
        const startedAt = new Date();
        let newToots: Toot[] = [];

        try {
            newToots = await tootFetcher;
        } catch (e) {
            console.error(`${logPrefix} Error fetching toots:`, e);
        }

        // Only need to lock the mutex when we start modifying common variables like this.feed
        const releaseMutex = await lockMutex(this.mergeMutex, logPrefix);

        try {
            this.feed = await this.mergeTootsWithFeed(newToots);
            await this.scoreAndFilterFeed();
            logInfo(TELEMETRY, `${label} merged ${newToots.length} toots ${inSeconds(startedAt)}:`, this.statusDict());
            return newToots;
        } finally {
            releaseMutex();
        }
    }

    // Remove invalid and duplicate toots, merge them with the feed, and update the filters
    // Does NOT mutate this.feed in place (though it does modify this.filters).
    private async mergeTootsWithFeed(toots: Toot[]): Promise<Toot[]> {
        toots = filterWithLog<Toot>(toots, t => t.isValidForFeed(), CLEANUP_FEED, 'invalid', 'Toot');
        toots = Toot.dedupeToots([...this.feed, ...toots], CLEANUP_FEED);
        this.filters = initializeFiltersWithSummaryInfo(toots, await MastoApi.instance.getUserData());
        return toots;
    }

    // Prepare the scorers for scoring. If 'force' is true, force them to recompute data even if they are already ready.
    private async prepareScorers(force?: boolean): Promise<void> {
        const logPrefix = `prepareScorers()`;
        const releaseMutex = await lockMutex(this.scoreMutex, logPrefix);

        try {
            if (force || this.featureScorers.some(scorer => !scorer.isReady)) {
                const startTime = new Date();
                await Promise.all(this.featureScorers.map(scorer => scorer.fetchRequiredData()));
                logInfo(TELEMETRY, `${logPrefix} ready in ${inSeconds(startTime)}`);
            }
        } finally {
            releaseMutex();
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

    // Score the feed, sort it, save it to storage, and call filterFeed() to update the feed in the app
    // Returns the FILTERED set of toots (NOT the entire feed!)
    private async scoreAndFilterFeed(): Promise<Toot[]> {
        await this.prepareScorers();
        this.feed = await Scorer.scoreToots(this.feed, this.featureScorers, this.feedScorers);
        this.feed = truncateToConfiguredLength(this.feed, "maxCachedTimelineToots");
        await Storage.setFeed(this.feed);
        return this.setFilteredFeedInApp();
    }

    // Simple string with important feed status information
    private statusMsg(): string {
        return Object.entries(this.statusDict()).map((k, v) => `${k}=${v}`).join(", ")
    }

    // Info about the state of this TheAlgorithm instance
    private statusDict(): Record<string, any> {
        return {
            tootsInFeed: this.feed?.length,
            loadingStatus: this.loadingStatus,
            catchupCheckpoint: this.catchupCheckpoint ? toISOFormat(this.catchupCheckpoint) : null,
            mostRecentHomeTootAt: toISOFormat(this.mostRecentHomeTootAt()),
        }
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
    // Helpers we also export
    extractDomain,
    keyByProperty,
    timeString,
};
