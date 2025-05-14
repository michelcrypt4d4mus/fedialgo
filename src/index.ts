/*
 * Main class that handles scoring and sorting a feed made of Toot objects.
 */
import 'reflect-metadata'; // Required for class-transformer
import { Buffer } from 'buffer'; // Maybe Required for class-transformer though seems to be required in client?
import { mastodon } from "masto";
import { Mutex } from 'async-mutex';

import Account from './api/objects/account';
import ChaosScorer from "./scorer/feature/chaos_scorer";
import DiversityFeedScorer from "./scorer/feed/diversity_feed_scorer";
import FavouritedTagsScorer from './scorer/feature/favourited_tags_scorer';
import FollowedTagsScorer from "./scorer/feature/followed_tags_scorer";
import HashtagParticipationScorer from "./scorer/feature/hashtag_participation_scorer";
import ImageAttachmentScorer from "./scorer/feature/image_attachment_scorer";
import InteractionsScorer from "./scorer/feature/interactions_scorer";
import MastoApi, { isAccessTokenRevokedError } from "./api/api";
import MastodonServer from './api/mastodon_server';
import MentionsFollowedScorer from './scorer/feature/mentions_followed_scorer';
import MostFavoritedAccountsScorer from "./scorer/feature/most_favorited_accounts_scorer";
import MostRepliedAccountsScorer from "./scorer/feature/most_replied_accounts_scorer";
import MostRetootedUsersScorer from "./scorer/feature/most_retooted_users_scorer";
import NumericFilter from "./filters/numeric_filter";
import NumFavoritesScorer from "./scorer/feature/num_favorites_scorer";
import NumRepliesScorer from "./scorer/feature/num_replies_scorer";
import NumRetootsScorer from "./scorer/feature/num_retoots_scorer";
import BooleanFilter, { BooleanFilterName, TypeFilterName } from "./filters/property_filter";
import RetootsInFeedScorer from "./scorer/feature/retoots_in_feed_scorer";
import Scorer from "./scorer/scorer";
import ScorerCache from './scorer/scorer_cache';
import Storage from "./Storage";
import Toot, { earliestTootedAt, mostRecentTootedAt } from './api/objects/toot';
import TrendingLinksScorer from './scorer/feature/trending_links_scorer';
import TrendingTagsScorer from "./scorer/feature/trending_tags_scorer";
import TrendingTootScorer from "./scorer/feature/trending_toots_scorer";
import UserData from "./api/user_data";
import VideoAttachmentScorer from "./scorer/feature/video_attachment_scorer";
import { ageInHours, ageInSeconds, ageString, sleep, timeString, toISOFormat } from './helpers/time_helpers';
import { buildNewFilterSettings, updateHashtagCounts, updatePropertyFilterOptions } from "./filters/feed_filters";
import { Config, MAX_ENDPOINT_RECORDS_TO_PULL, setLocale } from './config';
import { filterWithLog, sortKeysByValue, truncateToConfiguredLength } from "./helpers/collection_helpers";
import { getMoarData, MOAR_DATA_PREFIX } from "./api/poller";
import { getParticipatedHashtagToots, getRecentTootsForTrendingTags } from "./feeds/hashtags";
import { FEDIALGO, GIFV, SET_LOADING_STATUS, TELEMETRY, VIDEO_TYPES, bracketed, extractDomain } from './helpers/string_helpers';
import { isDebugMode, isQuickMode } from './helpers/environment_helpers';
import { BACKFILL_FEED, PREP_SCORERS, TRIGGER_FEED, lockExecution, logInfo, logDebug, logTelemetry, traceLog } from './helpers/log_helpers';
import { PresetWeightLabel, PresetWeights } from './scorer/weight_presets';
import {
    NON_SCORE_WEIGHTS,
    FeedFilterSettings,
    MastodonInstances,
    MediaCategory,
    ScorerDict,
    WeightInfo,
    StorageKey,
    StringNumberDict,
    TrendingLink,
    TrendingObj,
    TrendingStorage,
    TagWithUsageCounts,
    TrendingWithHistory,
    WeightName,
    Weights,
    MastodonTag,
} from "./types";

// Strings
const GET_FEED_BUSY_MSG = `called while load is still in progress. Consider using the setTimelineInApp() callback.`;
const FINALIZING_SCORES_MSG = `Finalizing scores`;
const INITIAL_LOAD_STATUS = "Retrieving initial data";
const PULLING_USER_HISTORY = `Pulling your historical data`;
const READY_TO_LOAD_MSG = "Ready to load"

// Constants
const DEFAULT_SET_TIMELINE_IN_APP = (feed: Toot[]) => console.debug(`Default setTimelineInApp() called`);
const REALLY_BIG_NUMBER = 10_000_000_000;
const PULL_USER_HISTORY_PARAMS = {maxRecords: REALLY_BIG_NUMBER, moar: true};

interface AlgorithmArgs {
    api: mastodon.rest.Client;
    user: mastodon.v1.Account;
    locale?: string;  // Optional locale to use for date formatting
    setTimelineInApp?: (feed: Toot[]) => void;  // Optional callback to set the feed in the code using this package
};


class TheAlgorithm {
    filters: FeedFilterSettings = buildNewFilterSettings();
    isDebug = isDebugMode;
    lastLoadTimeInSeconds: number | null = null;  // Duration of the last load in seconds
    // TODO: loadingStatus has become the main flag for whether the feed is loading or not. Not great.
    loadingStatus: string | null = READY_TO_LOAD_MSG;  // String describing load activity (undefined means load complete)
    mastodonServers: MastodonInstances = {};
    trendingData: TrendingStorage = {links: [], tags: [], toots: []};
    userData: UserData = new UserData();

    // Constructor argument variables
    private api: mastodon.rest.Client;
    private user: mastodon.v1.Account;
    private setTimelineInApp: (feed: Toot[]) => void;  // Optional callback to set the feed in the app using this package
    // Other private variables
    private feed: Toot[] = [];
    private homeFeed: Toot[] = [];  // Just the toots pulled from the home timeline
    private dataPoller?: ReturnType<typeof setInterval>;
    private hasProvidedAnyTootsToClient = false;  // Flag to indicate if the feed has been set in the app
    private loadStartedAt: Date | null = null;  // Timestamp of when the feed started loading
    private numTriggers = 0;
    private mergeMutex = new Mutex();
    private scoreMutex = new Mutex();

    // These can score a toot without knowing about the rest of the toots in the feed
    private featureScorers = [
        new ChaosScorer(),
        new FavouritedTagsScorer(),
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
    private feedScorers = [
        new DiversityFeedScorer(),
    ];

    weightedScorers = [
        ...this.featureScorers,
        ...this.feedScorers,
    ];

    weightInfo: ScorerDict = this.weightedScorers.reduce(
        (scorerInfos, scorer) => {
            scorerInfos[scorer.name] = scorer.getInfo();
            return scorerInfos;
        },
        NON_SCORE_WEIGHTS.reduce(
            (specialScoreInfos, weightName) => {
                specialScoreInfos[weightName] = Object.assign({}, Config.scorersConfig[weightName])
                return specialScoreInfos;
            },
            {} as ScorerDict
        )
    );

    // Publicly callable constructor() that instantiates the class and loads the feed from storage.
    static async create(params: AlgorithmArgs): Promise<TheAlgorithm> {
        setLocale(params.locale);
        const user = Account.build(params.user);
        await Storage.setIdentity(user);
        await Storage.logAppOpen();

        // Construct the algorithm object, set the default weights, load feed and filters
        const algo = new TheAlgorithm({api: params.api, user: user, setTimelineInApp: params.setTimelineInApp});
        ScorerCache.addScorers(algo.featureScorers, algo.feedScorers);
        await algo.loadCachedData();
        return algo;
    }

    private constructor(params: AlgorithmArgs) {
        this.api = params.api;
        this.user = params.user;
        this.setTimelineInApp = params.setTimelineInApp ?? DEFAULT_SET_TIMELINE_IN_APP;
        MastoApi.init(this.api, this.user as Account);
    }

    // Trigger the retrieval of the user's timeline from all the sources if maxId is not provided.
    async triggerFeedUpdate(moreOldToots?: boolean): Promise<void> {
        logInfo(TRIGGER_FEED, `called, ${++this.numTriggers} triggers so far, state:`, this.statusDict());
        this.checkIfLoading();
        if (moreOldToots) return await this.triggerHomeTimelineBackFill();
        if (this.checkIfSkipping()) return;
        this.setLoadingStateVariables(TRIGGER_FEED);

        let dataLoads: Promise<any>[] = [
            this.getHomeTimeline().then((toots) => this.homeFeed = toots),
            this.prepareScorers(),
        ];

        // Sleep to Delay the trending tag etc. toot pulls a bit because they generate a ton of API calls
        // TODO: do we really need to do this sleeping?
        await sleep(Config.hashtagTootRetrievalDelaySeconds);

        dataLoads = dataLoads.concat([
            this.fetchAndMergeToots(getParticipatedHashtagToots),
            this.fetchAndMergeToots(getRecentTootsForTrendingTags),
            this.fetchAndMergeToots(MastodonServer.fediverseTrendingToots.bind(MastodonServer)),
            // Population of instance variables - these are not required to be done before the feed is loaded
            MastodonServer.getMastodonInstancesInfo().then((servers) => this.mastodonServers = servers),
            MastodonServer.getTrendingData().then((trendingData) => this.trendingData = trendingData),
            MastoApi.instance.getUserData().then((userData) => this.userData = userData),
        ]);

        const allResults = await Promise.all(dataLoads);
        traceLog(`[${TRIGGER_FEED}] FINISHED promises, allResults:`, allResults);
        await this.finishFeedUpdate();
    }

    // Trigger the loading of additional toots, farther back on the home timeline
    async triggerHomeTimelineBackFill(): Promise<void> {
        console.log(`${bracketed(BACKFILL_FEED)} called, state:`, this.statusDict());
        this.checkIfLoading();
        this.setLoadingStateVariables(BACKFILL_FEED);
        this.homeFeed = await this.getHomeTimeline(true);
        await this.finishFeedUpdate();
    }

    // Collect *ALL* the user's history data from the server - past toots, favourites, etc.
    // Use with caution!
    async triggerPullAllUserData(): Promise<void> {
        const logPrefix = bracketed(`triggerPullAllUserData()`);
        console.log(`${logPrefix} called, state:`, this.statusDict());
        this.checkIfLoading();
        this.setLoadingStateVariables(PULLING_USER_HISTORY);
        this.dataPoller && clearInterval(this.dataPoller!);   // Stop the dataPoller if it's running

        try {
            const _allResults = await Promise.all([
                MastoApi.instance.getFavouritedToots(PULL_USER_HISTORY_PARAMS),
                MastoApi.instance.getNotifications({maxRecords: MAX_ENDPOINT_RECORDS_TO_PULL, moar: true}),
                // MastoApi.instance.getNotifications(moarParams),
                MastoApi.instance.getRecentUserToots(PULL_USER_HISTORY_PARAMS),
            ]);

            // traceLog(`${logPrefix} FINISHED, allResults:`, allResults);
            await this.recomputeScorers();
        } catch (error) {
            console.error(`${logPrefix} Error pulling user data:`, error);
        }

        // TODO: should we restart the data poller?
        this.loadingStatus = null;
        console.log(`${logPrefix} finished`);
    }

    // Return the current filtered timeline feed in weight order
    getTimeline(): Toot[] {
        return this.filterFeedAndSetInApp();
    }

    // Return the user's current weightings for each score category
    async getUserWeights(): Promise<Weights> {
        return await Storage.getWeights();
    }

    // TODO: Using loadingStatus as the main determinant of state is kind of janky
    isLoading(): boolean {
        return !!(this.loadingStatus && this.loadingStatus != READY_TO_LOAD_MSG)
    }

    // Log a message with the current state of TheAlgorithm instance
    async logWithState(prefix: string, msg: string): Promise<void> {
        prefix = bracketed(prefix)
        console.log(`${prefix} ${msg}. state:`, this.statusDict());
        console.log(`${prefix} current UserData:`, await MastoApi.instance.getUserData());
        Storage.dumpData();
    }

    // Return the timestamp of the most recent toot from followed accounts + hashtags ONLY
    mostRecentHomeTootAt(): Date | null {
        // TODO: this.homeFeed is only set when fetchHomeFeed() is *finished*
        if (this.homeFeed.length == 0 && this.numTriggers > 1) {
            console.warn(`mostRecentHomeTootAt() homeFeed is empty, falling back to full feed`);
            return mostRecentTootedAt(this.feed);
        }

        return mostRecentTootedAt(this.homeFeed);
    }

    // Return the number of seconds since the most recent home timeline toot
    mostRecentHomeTootAgeInSeconds(): number | null {
        const mostRecentAt = this.mostRecentHomeTootAt();

        if (!mostRecentAt) {
            if (this.feed.length) console.warn(`${this.feed.length} toots in feed but no most recent toot found!`);
            return null;
        }

        const feedAgeInSeconds = ageInSeconds(mostRecentAt);
        traceLog(`feed is ${(feedAgeInSeconds / 60).toFixed(2)} minutes old, most recent home toot: ${timeString(mostRecentAt)}`);
        return feedAgeInSeconds;
    }

    // Clear everything from browser storage except the user's identity and weightings
    async reset(): Promise<void> {
        console.warn(`reset() called, clearing all storage...`);
        MastoApi.instance.setSemaphoreConcurrency(Config.maxConcurrentRequestsInitial);
        this.dataPoller && clearInterval(this.dataPoller!);
        this.dataPoller = undefined;
        this.hasProvidedAnyTootsToClient = false;
        this.loadingStatus = READY_TO_LOAD_MSG;
        this.loadStartedAt = null;
        this.mastodonServers = {};
        this.feed = [];
        this.numTriggers = 0;
        await Storage.clearAll();
        await this.loadCachedData();
    }

    tagUrl(tag: string | MastodonTag): string {
        return MastoApi.instance.tagUrl(tag);
    }

    // Update the feed filters and return the newly filtered feed
    updateFilters(newFilters: FeedFilterSettings): Toot[] {
        console.log(`updateFilters() called with newFilters:`, newFilters);
        this.filters = newFilters;
        Storage.setFilters(newFilters);
        return this.filterFeedAndSetInApp();
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

    // Throw an error if the feed is loading
    private checkIfLoading(): void {
        if (this.isLoading()) {
            console.warn(`[${TRIGGER_FEED}] Load in progress already!`, this.statusDict());
            throw new Error(`${TRIGGER_FEED} ${GET_FEED_BUSY_MSG}`);
        }
    }

    // Return true if we're in quick mode and the feed is fresh enough that we don't need to update it (for dev)
    private checkIfSkipping(): boolean {
        let feedAgeInMinutes = this.mostRecentHomeTootAgeInSeconds();
        if (feedAgeInMinutes) feedAgeInMinutes /= 60;

        if (isQuickMode && feedAgeInMinutes && feedAgeInMinutes < Config.staleDataTrendingMinutes && this.numTriggers <= 1) {
            console.debug(`[${TRIGGER_FEED}] QUICK_MODE Feed is fresh (${feedAgeInMinutes.toFixed(0)}s old), not updating`);
            return true;
        } else {
            return false;
        }
    }

    // Merge a new batch of toots into the feed.
    // Mutates this.feed and returns whatever newToots are retrieve by tooFetcher()
    private async fetchAndMergeToots(tootFetcher: () => Promise<Toot[]>): Promise<Toot[]> {
        const logPrefix = tootFetcher.name;
        const startedAt = new Date();
        let newToots: Toot[] = [];

        try {
            newToots = await tootFetcher();
            this.logTelemetry(logPrefix, `fetched ${newToots.length} toots`, startedAt);
        } catch (e) {
            MastoApi.throwIfAccessTokenRevoked(e, `${logPrefix} Error fetching toots ${ageString(startedAt)}`);
        }

        await this.lockedMergeToFeed(newToots, logPrefix);
        return newToots;
    }

    // Filter the feed based on the user's settings. Has the side effect of calling the setTimelineInApp() callback
    // that will send the client using this library the filtered subset of Toots (this.feed will always maintain
    // the master timeline).
    private filterFeedAndSetInApp(): Toot[] {
        const filteredFeed = this.feed.filter(toot => toot.isInTimeline(this.filters));
        this.setTimelineInApp(filteredFeed);

        if (!this.hasProvidedAnyTootsToClient && this.feed.length > 0) {
            this.hasProvidedAnyTootsToClient = true;
            const msg = `First ${filteredFeed.length} toots sent to client`;
            this.logTelemetry('filterFeedAndSetInApp', msg, this.loadStartedAt || new Date());
        }

        return filteredFeed;
    }

    // The "load is finished" version of setLoadingStateVariables().
    private async finishFeedUpdate(): Promise<void> {
        // Now that all data has arrived, go back over and do the slow calculations of Toot.trendingLinks etc.
        const logPrefix = bracketed(`${SET_LOADING_STATUS} finishFeedUpdate()`);
        this.loadingStatus = FINALIZING_SCORES_MSG;
        console.debug(`${logPrefix} ${FINALIZING_SCORES_MSG}...`);
        await Toot.completeToots(this.feed, TRIGGER_FEED + " DEEP", true);
        updatePropertyFilterOptions(this.filters, this.feed, await MastoApi.instance.getUserData());
        //updateHashtagCounts(this.filters, this.feed);  // TODO: this takes too long (4 minutes for 3000 toots)
        await this.scoreAndFilterFeed();
        this.loadingStatus = null;

        if (this.loadStartedAt) {
            this.logTelemetry(logPrefix, `finished home TL load w/ ${this.feed.length} toots`, this.loadStartedAt);
            this.lastLoadTimeInSeconds = ageInSeconds(this.loadStartedAt);
        } else {
            console.warn(`${logPrefix} ${TELEMETRY} finished but loadStartedAt is null!`);
            this.lastLoadTimeInSeconds = null;
        }

        this.loadStartedAt = null;
        MastoApi.instance.setSemaphoreConcurrency(Config.maxConcurrentRequestsBackground);
        this.launchBackgroundPoller();
    }

    // Simple wrapper for triggering fetchHomeFeed()
    private async getHomeTimeline(moreOldToots?: boolean): Promise<Toot[]> {
        return await MastoApi.instance.fetchHomeFeed({
            mergeTootsToFeed: this.lockedMergeToFeed.bind(this),
            moar: moreOldToots
        });
    }

    // Kick off the MOAR data poller to collect more user history data if it doesn't already exist
    private launchBackgroundPoller(): void {
        if (this.dataPoller) {
            console.log(`${MOAR_DATA_PREFIX} data poller already exists, not starting another one`);
            return;
        }

        this.dataPoller = setInterval(
            async () => {
                const shouldContinue = await getMoarData();
                await this.recomputeScorers();  // Force scorers to recompute data, rescore the feed

                if (!shouldContinue) {
                    logInfo(MOAR_DATA_PREFIX, `stopping data poller...`);
                    this.dataPoller && clearInterval(this.dataPoller!);
                }
            },
            Config.backgroundLoadIntervalSeconds * 1000
        );
    }

    // Load cached data from storage. This is called when the app is first opened and when reset() is called.
    private async loadCachedData(): Promise<void> {
        this.feed = await Storage.getCoerced<Toot>(StorageKey.TIMELINE);
        this.homeFeed = await Storage.getCoerced<Toot>(StorageKey.HOME_TIMELINE);
        this.mastodonServers = (await Storage.get(StorageKey.FEDIVERSE_POPULAR_SERVERS) || {}) as MastodonInstances;
        this.trendingData = await Storage.getTrendingData();
        this.userData = await Storage.loadUserData();
        this.filters = await Storage.getFilters() ?? buildNewFilterSettings();
        updatePropertyFilterOptions(this.filters, this.feed, this.userData);
        this.setTimelineInApp(this.feed);
        console.log(`[fedialgo] loaded ${this.feed.length} timeline toots from cache, trendingData`);
    }

    // Apparently if the mutex lock is inside mergeTootsToFeed() then the state of this.feed is not consistent
    // which can result in toots getting lost as threads try to merge newToots into different this.feed states.
    // Wrapping the entire function in a mutex seems to fix this (though i'm not sure why).
    private async lockedMergeToFeed(newToots: Toot[], logPrefix: string): Promise<void> {
        newToots = filterWithLog(newToots, t => t.isValidForFeed(), logPrefix, 'invalid', 'Toot');
        const releaseMutex = await lockExecution(this.mergeMutex, logPrefix);

        try {
            await this.mergeTootsToFeed(newToots, logPrefix);
            traceLog(`[${SET_LOADING_STATUS}] ${logPrefix} lockedMergeToFeed() finished mutex`);
        } finally {
            releaseMutex();
        }
    };

    // Log timing info
    private logTelemetry(logPrefix: string, msg: string, startedAt: Date): void {
        logTelemetry(logPrefix, msg, startedAt, 'current state', this.statusDict());
    }

    // Merge newToots into this.feed, score, and filter the feed.
    // NOTE: Don't call this directly! Use lockedMergeTootsToFeed() instead.
    private async mergeTootsToFeed(newToots: Toot[], logPrefix: string): Promise<void> {
        const numTootsBefore = this.feed.length;
        const startedAt = new Date();

        this.feed = Toot.dedupeToots([...this.feed, ...newToots], logPrefix);
        updatePropertyFilterOptions(this.filters, this.feed, await MastoApi.instance.getUserData());
        await this.scoreAndFilterFeed();
        this.logTelemetry(logPrefix, `merged ${newToots.length} new toots into ${numTootsBefore}`, startedAt);
        this.setLoadingStateVariables(logPrefix);
    }

    // Prepare the scorers for scoring. If 'force' is true, force them to recompute data even if they are already ready.
    private async prepareScorers(force?: boolean): Promise<void> {
        const releaseMutex = await lockExecution(this.scoreMutex, PREP_SCORERS);

        try {
            if (force || this.featureScorers.some(scorer => !scorer.isReady)) {
                const startedAt = new Date();
                await Promise.all(this.featureScorers.map(scorer => scorer.fetchRequiredData()));
                this.logTelemetry(PREP_SCORERS, `${this.featureScorers.length} scorers ready`, startedAt);
            }
        } finally {
            releaseMutex();
        }
    }

    // Recompute the scorers' computations based on user history etc. and trigger a rescore of the feed
    private async recomputeScorers(): Promise<void> {
        await this.userData.populate();
        await this.prepareScorers(true);  // The "true" arg is the key here
        await this.scoreAndFilterFeed();
    }

    // Score the feed, sort it, save it to storage, and call filterFeed() to update the feed in the app
    // Returns the FILTERED set of toots (NOT the entire feed!)
    private async scoreAndFilterFeed(): Promise<Toot[]> {
        await this.prepareScorers();  // Make sure the scorers are ready to go
        this.feed = await Scorer.scoreToots(this.feed, true);
        this.feed = truncateToConfiguredLength(this.feed, "maxCachedTimelineToots");
        await Storage.set(StorageKey.TIMELINE, this.feed);
        return this.filterFeedAndSetInApp();
    }

    // sets this.loadingStatus to a message indicating the current state of the feed
    private setLoadingStateVariables(logPrefix: string): void {
        if ([BACKFILL_FEED, PULLING_USER_HISTORY, TRIGGER_FEED].includes(logPrefix)) this.loadStartedAt = new Date();

        // If feed is empty then it's an initial load, otherwise it's a catchup if TRIGGER_FEED
        if (!this.feed.length) {
            this.loadingStatus = INITIAL_LOAD_STATUS;
        } else if (logPrefix == BACKFILL_FEED) {
            this.loadingStatus = `Loading older home timeline toots`;
        } else if (logPrefix == PULLING_USER_HISTORY) {
            this.loadingStatus = PULLING_USER_HISTORY;
        } else if (this.homeFeed.length > 0) {
            const mostRecentAt = this.mostRecentHomeTootAt();
            this.loadingStatus = `Loading new toots` + (mostRecentAt ? ` since ${timeString(mostRecentAt)}` : '');
        } else {
            this.loadingStatus = `Loading more toots (retrieved ${this.feed.length.toLocaleString()} toots so far)`;
        }

        logDebug(`[${SET_LOADING_STATUS}] ${logPrefix}`, `setLoadingStateVariables()`, this.statusDict());
    }

    // Info about the state of this TheAlgorithm instance
    private statusDict(): Record<string, any> {
        const mostRecentTootAt = this.mostRecentHomeTootAt();
        const oldestTootAt = earliestTootedAt(this.homeFeed);
        let numHoursInHomeFeed: number | null = null;

        if (mostRecentTootAt && oldestTootAt) {
            numHoursInHomeFeed = ageInHours(oldestTootAt, mostRecentTootAt);
        }

        return {
            feedNumToots: this.feed?.length,
            homeFeedNumToots: this.homeFeed?.length,
            homeFeedMostRecentAt: mostRecentTootAt ? toISOFormat(mostRecentTootAt) : null,
            homeFeedOldestAt: oldestTootAt ? toISOFormat(oldestTootAt) : null,
            homeFeedTimespanHours: numHoursInHomeFeed ? Number(numHoursInHomeFeed.toPrecision(2)) : null,
            loadingStatus: this.loadingStatus,
        };
    }
};


// Export types and constants needed by apps using this package
export {
    FEDIALGO,
    GET_FEED_BUSY_MSG,
    GIFV,
    NON_SCORE_WEIGHTS,
    READY_TO_LOAD_MSG,
    VIDEO_TYPES,
    Account,
    BooleanFilter,
    BooleanFilterName,
    FeedFilterSettings,
    MediaCategory,
    NumericFilter,
    PresetWeightLabel,
    PresetWeights,
    StringNumberDict,
    TheAlgorithm,
    Toot,
    TrendingLink,
    TrendingObj,
    TagWithUsageCounts,
    TrendingWithHistory,
    TypeFilterName,
    WeightInfo,
    WeightName,
    Weights,
    // Helpers we also export
    extractDomain,
    isAccessTokenRevokedError,
    isDebugMode,
    timeString,
    sortKeysByValue,
};
