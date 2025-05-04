/*
 * Main class that handles scoring and sorting a feed made of Toot objects.
 */
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
import { ageInSeconds, ageString, quotedISOFmt, timelineCutoffAt, timeString, toISOFormat } from './helpers/time_helpers';
import { buildNewFilterSettings, initializeFiltersWithSummaryInfo } from "./filters/feed_filters";
import { CLEANUP_FEED, TRIGGER_FEED, PREP_SCORERS, lockMutex, logInfo } from './helpers/log_helpers';
import { DEFAULT_WEIGHTS } from './scorer/weight_presets';
import { filterWithLog, truncateToConfiguredLength } from "./helpers/collection_helpers";
import { getMoarData, MOAR_DATA_PREFIX } from "./api/poller";
import { getParticipatedHashtagToots, getRecentTootsForTrendingTags } from "./feeds/hashtags";
import { GIFV, TELEMETRY, VIDEO_TYPES, extractDomain } from './helpers/string_helpers';
import { PresetWeightLabel, PresetWeights } from './scorer/weight_presets';
import { SCORERS_CONFIG } from "./config";
import {
    FeedFilterSettings,
    MastodonInstances,
    MediaCategory,
    ScorerDict,
    ScorerInfo,
    StorageKey,
    StringNumberDict,
    TrendingLink,
    TrendingObj,
    TrendingStorage,
    TrendingTag,
    TrendingWithHistory,
    WeightName,
    Weights,
} from "./types";

const DEFAULT_SET_TIMELINE_IN_APP = (feed: Toot[]) => console.debug(`Default setTimelineInApp() called`)
const GET_FEED_BUSY_MSG = `called while load is still in progress. Consider using the setTimelineInApp() callback.`
// TODO: The demo app prefixes these with "Loading (msg)..." which is not ideal
const INITIAL_STATUS_MSG = "(ready to load)"
const INITIAL_LOAD_STATUS = "initial data";
const MAX_ID_IDX = 2;

interface AlgorithmArgs {
    api: mastodon.rest.Client;
    user: mastodon.v1.Account;
    setTimelineInApp?: (feed: Toot[]) => void;  // Optional callback to set the feed in the code using this package
};


class TheAlgorithm {
    filters: FeedFilterSettings = buildNewFilterSettings();
    lastLoadTimeInSeconds: number | null = null;  // Duration of the last load in seconds
    // TODO: loadingStatus has become the main flag for whether the feed is loading or not. Not great.
    loadingStatus: string | null = INITIAL_STATUS_MSG;  // String describing load activity (undefined means load complete)
    mastodonServers: MastodonInstances = {};
    trendingData: TrendingStorage = {links: [], tags: [], toots: []};
    userData: UserData = new UserData();

    // Constructor argument variables
    private api: mastodon.rest.Client;
    private user: mastodon.v1.Account;
    private setTimelineInApp: (feed: Toot[]) => void;  // Optional callback to set the feed in the app using this package
    // Other private variables
    private feed: Toot[] = [];
    private catchupCheckpoint: Date | null = null;  // If doing a catch up refresh load we need to get back to this timestamp
    private dataPoller?: ReturnType<typeof setInterval>;
    private hasProvidedAnyTootsToClient = false;  // Flag to indicate if the feed has been set in the app
    private loadStartedAt: Date | null = null;  // Timestamp of when the feed started loading
    private mergeMutex = new Mutex();
    private scoreMutex = new Mutex();

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

    // Publicly callable constructor() that instantiates the class and loads the feed from storage.
    static async create(params: AlgorithmArgs): Promise<TheAlgorithm> {
        const user = new Account(params.user);
        await Storage.setIdentity(user);
        await Storage.logAppOpen();

        // Construct the algorithm object, set the default weights, load feed and filters
        const algo = new TheAlgorithm({api: params.api, user: user, setTimelineInApp: params.setTimelineInApp});
        await algo.setDefaultWeights();
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
    // If maxId is provided, just fetch next batch from mastodon home timeline API.
    async triggerFeedUpdate(numTimelineToots?: number, maxId?: string): Promise<void> {
        logInfo(TRIGGER_FEED, `(maxId=${maxId}), state:`, this.statusDict());
        const numHomeTootsRequested = Storage.getConfig().numTootsInFirstFetch;
        const isInitialCall = !maxId;  // First call from client has maxId

        // Start the loading process
        this.setLoadStartStateVariables(isInitialCall);
        const fetchHomeFeed = async () => await MastoApi.instance.fetchHomeFeed(numHomeTootsRequested, maxId);

        // Trigger initial fetch of user's home timeline
        this.fetchAndMergeToots(fetchHomeFeed).then((newToots) => {
            this.logNewHomeTootsArrived(newToots);
            // maybeGetMoreToots() recursively calls triggerFeedUpdate() until we have enough toots
            this.maybeGetMoreToots(newToots, numHomeTootsRequested!);
        });

        // The first time triggerFeedUpdate() is called we need to load a bunch of other data
        if (isInitialCall) {
            this.prepareScorers();
            MastodonServer.getMastodonInstancesInfo().then((servers) => this.mastodonServers = servers);
            MastodonServer.getTrendingData().then((trendingData) => this.trendingData = trendingData);
            MastoApi.instance.getUserData().then((userData) => this.userData = userData);
            this.fetchAndMergeToots(MastodonServer.fediverseTrendingToots.bind(MastodonServer));

            // Deay the trending tag toot pulls a bit because they generate a ton of API calls
            setTimeout(
                () => {
                    console.debug(`${TRIGGER_FEED} Launching delayed hash tag toots getters...`);
                    this.fetchAndMergeToots(getRecentTootsForTrendingTags);
                    this.fetchAndMergeToots(getParticipatedHashtagToots);
                },
                Storage.getConfig().delayBeforePullingHashtagTootsMS
            );
        }
    }

    // private async fetchHomeTimeline(maxId?: string): Promise<Toot[]> {
    //     const numHomeTootsRequested = Storage.getConfig().numTootsInFirstFetch;
    //     await MastoApi.instance.fetchHomeFeed(numHomeTootsRequested, maxId)
    // }

    // Return the current filtered timeline feed in weight order
    getTimeline(): Toot[] {
        return this.filterFeedAndSetInApp();
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

    // Clear everything from browser storage except the user's identity and weightings
    async reset(): Promise<void> {
        console.warn(`reset() called, clearing all storage...`);
        this.dataPoller && clearInterval(this.dataPoller!);
        this.hasProvidedAnyTootsToClient = false;
        this.loadingStatus = INITIAL_STATUS_MSG;
        this.loadStartedAt = null;
        this.mastodonServers = {};
        this.catchupCheckpoint = null;
        await Storage.clearAll();
        await this.loadCachedData();
    }

    // Filter the feed based on the user's settings. Has the side effect of calling the setTimelineInApp() callback
    // that will send the client using this library the filtered subset of Toots (this.feed will always maintain
    // the master timeline).
    private filterFeedAndSetInApp(): Toot[] {
        const filteredFeed = this.feed.filter(toot => toot.isInTimeline(this.filters));
        this.setTimelineInApp(filteredFeed);

        if (!this.hasProvidedAnyTootsToClient && this.feed.length > 0) {
            this.hasProvidedAnyTootsToClient = true;
            logInfo(TELEMETRY, `First ${filteredFeed.length} toots sent to client ${ageString(this.loadStartedAt)}`);
        }

        return filteredFeed;
    }

    // Filter the feed to only include toots from followed accounts
    private homeTimelineToots(): Toot[] {
        return this.feed.filter(toot => toot.isFollowed);
    }

    // Kick off the MOAR data poller to collect more user history data if it doesn't already exist
    private launchBackgroundPoller(): void {
        if (this.dataPoller) {
            console.log(`${MOAR_DATA_PREFIX} data poller already exists, not starting another one`);
            return;
        }

        console.log(`${MOAR_DATA_PREFIX} starting data poller...`);

        this.dataPoller = setInterval(
            async () => {
                // Force scorers to recompute data, rescore the feed
                const shouldContinue = await getMoarData();
                await this.userData.populate();
                await this.prepareScorers(true);
                await this.scoreAndFilterFeed();

                if (!shouldContinue) {
                    console.log(`${MOAR_DATA_PREFIX} stopping data poller...`);
                    this.dataPoller && clearInterval(this.dataPoller!);
                }
            },
            Storage.getConfig().backgroundLoadIntervalMS
        );
    }

    // Load cached data from storage. This is called when the app is first opened and when reset() is called.
    private async loadCachedData(): Promise<void> {
        this.feed = (await Storage.getToots(StorageKey.TIMELINE)) ?? [];
        this.filters = await Storage.getFilters() ?? buildNewFilterSettings();
        this.trendingData = await Storage.getTrending();
        this.userData = await Storage.getUserData();
        this.setTimelineInApp(this.feed);
        console.log(`[fedialgo] loaded ${this.feed.length} timeline toots from cache, trendingData`);
    }

    // Logging helper.
    private logNewHomeTootsArrived(newToots: Toot[]): void {
        let msg = `fetchHomeFeed got ${newToots.length} new home timeline toots, ${this.homeTimelineToots().length}`;
        msg += ` total home TL toots so far ${ageString(this.loadStartedAt)}. Calling maybeGetMoreToots()...`;
        logInfo(TRIGGER_FEED, msg);
    }

    // Log a message with the current state of the state variables
    private logWithState(prefix: string, msg: string): void {
        console.log(`${prefix} ${msg}. state:`, this.statusDict());
    }

    // Decide whether we should fetch more home timeline toots based on current state + the new toots we just got
    private shouldGetMoreHomeToots(newHomeToots: Toot[], numHomeTootsRequested: number): boolean {
        const maxInitialTimelineToots = Storage.getConfig().maxInitialTimelineToots;
        const earliestNewHomeTootAt = earliestTootedAt(newHomeToots);

        // If we don't have enough toots yet and we got almost all the numTimelineToots we requested last time
        // ("almost" bc sometimes we get 38 records instead of 40) then there's probably more toots to fetch.
        if ((this.feed.length < maxInitialTimelineToots && newHomeToots.length >= (numHomeTootsRequested - MAX_ID_IDX))) {
            return true;
        }

        // Or if we have enough toots but the catchupCheckpoint is older than what we just got also fetch more
        if (this.catchupCheckpoint && earliestNewHomeTootAt && earliestNewHomeTootAt > this.catchupCheckpoint) {
            return true;
        }

        return false;
    }

    // Decide what is the current state of the world and whether to continue fetching home timeline toots
    private async maybeGetMoreToots(newHomeToots: Toot[], numHomeTootsRequested: number): Promise<void> {
        const config = Storage.getConfig();
        const maxInitialTimelineToots = config.maxInitialTimelineToots;
        const earliestNewHomeTootAt = earliestTootedAt(newHomeToots);
        let logPrefix = `[maybeGetMoreToots()]`;

        if (this.shouldGetMoreHomeToots(newHomeToots, numHomeTootsRequested)) {
            // Extract the minimum ID from the last batch of toots (or almost - we use the 3rd toot bc sometimes
            // there are weird outliers in the 1st toot). We must ONLY look at home timeline toots for this -
            // toots from other servers will have different ID schemes.
            // TODO: this is kind of shaky logic - what if a user follows almost no one and has an empty feed?
            const maxId = sortByCreatedAt(newHomeToots)[MAX_ID_IDX].id;
            this.logWithState(logPrefix, `Scheduling ${TRIGGER_FEED} recursively with maxID='${maxId}'`);
            setTimeout(() => this.triggerFeedUpdate(numHomeTootsRequested, maxId), config.incrementalLoadDelayMS);
            return;
        }

        // Otherwise stop (either we have enough toots, the last fetch didn't get fulfilled, or we hit the checkpoint)
        logPrefix += ` Halting ${TRIGGER_FEED}:`;

        if (this.catchupCheckpoint) {  // If we hit the checkpoint
            if (earliestNewHomeTootAt && earliestNewHomeTootAt < this.catchupCheckpoint) {
                let msg = `all caught up: oldest newHomeToot is ${quotedISOFmt(earliestNewHomeTootAt)}`;
                this.logWithState(logPrefix, `${msg}, older than checkpoint ${quotedISOFmt(this.catchupCheckpoint)}`);
                this.catchupCheckpoint = null;
            } else {
                console.warn(`${logPrefix} but NOT caught up to catchupCheckpoint! state:`, this.statusDict());
            }
        } else if (this.feed.length >= maxInitialTimelineToots) {  // Or if we have enough toots
            this.logWithState(logPrefix, `done (have ${this.feed.length} toots, wanted ${maxInitialTimelineToots})`);
        } else {  // Otherwise (presumably) the last fetch didn't get fulfilled
            this.logWithState(logPrefix, `last fetch only got ${newHomeToots.length} toots, expected ${numHomeTootsRequested}`);
        }

        // Now that we have a complete set of initial toots start the background data poller and lower concurrency
        this.launchBackgroundPoller();
        this.setLoadCompleteStateVariables();
        MastoApi.instance.setBackgroundConcurrency();
        this.loadingStatus = null;
    }

    // Merge a new batch of toots into the feed. Returns whatever toots are retrieve by tooFetcher
    private async fetchAndMergeToots(tootFetcher: () => Promise<Toot[]>): Promise<Toot[]> {
        const logPrefix = `fetchAndMergeToots() ${tootFetcher.name}`;
        const startedAt = new Date();
        let newToots: Toot[] = [];
        const logTootsStr = () => `${newToots.length} toots ${ageString(startedAt)}`;
        console.debug(`${logPrefix} started fetching toots...`);

        try {
            newToots = await tootFetcher();
            logInfo(logPrefix, `${TELEMETRY} fetched ${logTootsStr()}`);
        } catch (e) {
            MastoApi.throwIfAccessTokenRevoked(e, `${logPrefix} Error fetching toots ${ageString(startedAt)}`);
        }

        // Only need to lock the mutex when we start modifying common variables like this.feed
        const releaseMutex = await lockMutex(this.mergeMutex, logPrefix);

        try {
            this.feed = await this.mergeTootsWithFeed(newToots);
            await this.scoreAndFilterFeed();
            logInfo(logPrefix, `${TELEMETRY} fetch + merge complete ${logTootsStr()}, state:`, this.statusDict());
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

    // Return the timestamp of the most recent toot from followed accounts ONLY
    private mostRecentHomeTootAt(): Date | null {
        return mostRecentTootedAt(this.homeTimelineToots());
    }

    // Prepare the scorers for scoring. If 'force' is true, force them to recompute data even if they are already ready.
    private async prepareScorers(force?: boolean): Promise<void> {
        const releaseMutex = await lockMutex(this.scoreMutex, PREP_SCORERS);

        try {
            if (force || this.featureScorers.some(scorer => !scorer.isReady)) {
                const startTime = new Date();
                await Promise.all(this.featureScorers.map(scorer => scorer.fetchRequiredData()));
                logInfo(TELEMETRY, `${PREP_SCORERS} ready in ${ageString(startTime)}`);
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
        return this.filterFeedAndSetInApp();
    }

    // The "load is finished" version of setLoadingStateVariables(). // TODO: there's too many state variables
    private setLoadCompleteStateVariables(): void {
        if (this.loadStartedAt) {
            logInfo(TELEMETRY, `Finished home TL load w/ ${this.feed.length} toots ${ageString(this.loadStartedAt)}`);
            this.lastLoadTimeInSeconds = ageInSeconds(this.loadStartedAt);
            this.loadStartedAt = null;
        } else {
            this.lastLoadTimeInSeconds = null;
            console.warn(`[${TELEMETRY}] FINISHED LOAD... but loadStartedAt is null!`);
        }
    }

    // sets this.loadingStatus to a message indicating the current state of the feed
    // If isinitialCall is true:
    //    - sets this.catchupCheckpoint to the most recent toot in the feed
    //    - sets this.loadStartedAt to the current time
    private setLoadStartStateVariables(isInitialCall: boolean): void {
        if (isInitialCall) {
            this.loadStartedAt = new Date();

            // If triggerFeedUpdate() is called with no maxId and no toots in the feed then it's an initial load.
            if (!this.feed.length) {
                this.loadingStatus = INITIAL_LOAD_STATUS;
                return;
            }

            // Otherwise if there's no maxId but there is already an existing feed array that means it's a refresh
            const mostRecentHomeTootAt = this.mostRecentHomeTootAt();

            if (mostRecentHomeTootAt! < timelineCutoffAt()) {
                console.log(`${TRIGGER_FEED} no maxId but most recent toot ${mostRecentHomeTootAt} older than cutoff`);
                this.catchupCheckpoint = timelineCutoffAt();
            } else {
                this.catchupCheckpoint = mostRecentHomeTootAt;
            }

            this.loadingStatus = `new toots since ${timeString(this.catchupCheckpoint)}`;
        } else {
            this.loadingStatus = `more toots (retrieved ${this.feed.length.toLocaleString()} toots so far`;

            if (this.feed.length < Storage.getConfig().maxInitialTimelineToots) {
                this.loadingStatus += `, want ${Storage.getConfig().maxInitialTimelineToots.toLocaleString()}`;
            }

            this.loadingStatus += ')';
        }
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
    timeString,
};
