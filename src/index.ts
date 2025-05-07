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
import Toot, { earliestTootedAt, mostRecentTootedAt } from './api/objects/toot';
import TrendingLinksScorer from './scorer/feature/trending_links_scorer';
import TrendingTagsScorer from "./scorer/feature/trending_tags_scorer";
import TrendingTootScorer from "./scorer/feature/trending_toots_scorer";
import UserData from "./api/user_data";
import VideoAttachmentScorer from "./scorer/feature/video_attachment_scorer";
import { ageInSeconds, ageString, quotedISOFmt, timelineCutoffAt, timeString, toISOFormat } from './helpers/time_helpers';
import { buildNewFilterSettings, updatePropertyFilterOptions } from "./filters/feed_filters";
import { CLEANUP_FEED, TRIGGER_FEED, PREP_SCORERS, lockExecution, logInfo, logAndThrowError, traceLog } from './helpers/log_helpers';
import { Config, SCORERS_CONFIG } from './config';
import { DEFAULT_WEIGHTS } from './scorer/weight_presets';
import { filterWithLog, truncateToConfiguredLength } from "./helpers/collection_helpers";
import { getMoarData, MOAR_DATA_PREFIX } from "./api/poller";
import { getParticipatedHashtagToots, getRecentTootsForTrendingTags } from "./feeds/hashtags";
import { GIFV, TELEMETRY, VIDEO_TYPES, extractDomain } from './helpers/string_helpers';
import { PresetWeightLabel, PresetWeights } from './scorer/weight_presets';
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
const INITIAL_LOAD_STATUS = "initial data";
const READY_TO_LOAD_MSG = "(ready to load)"

interface AlgorithmArgs {
    api: mastodon.rest.Client;
    user: mastodon.v1.Account;
    setTimelineInApp?: (feed: Toot[]) => void;  // Optional callback to set the feed in the code using this package
    language?: string;  // Optional locale to use for date formatting
};


class TheAlgorithm {
    filters: FeedFilterSettings = buildNewFilterSettings();
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
            [WeightName.OUTLIER_DAMPENER]: Object.assign({}, SCORERS_CONFIG[WeightName.OUTLIER_DAMPENER]),
            [WeightName.TIME_DECAY]: Object.assign({}, SCORERS_CONFIG[WeightName.TIME_DECAY]),
            [WeightName.TRENDING]: Object.assign({}, SCORERS_CONFIG[WeightName.TRENDING]),
        } as ScorerDict
    );

    // Publicly callable constructor() that instantiates the class and loads the feed from storage.
    static async create(params: AlgorithmArgs): Promise<TheAlgorithm> {
        if (params.language) {
            if (params.language in Config.foreignLanguageServers) {
                Config.language = params.language;
            } else {
                console.warn(`Language ${params.language} not supported, using default ${Config.defaultLanguage}`);
            }
        }

        const user = Account.build(params.user);
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
    async triggerFeedUpdate(): Promise<void> {
        logInfo(TRIGGER_FEED, `called, state:`, this.statusDict());
        if (this.isLoading()) logAndThrowError(`[${TRIGGER_FEED}] ${GET_FEED_BUSY_MSG}`);
        this.setLoadingStateVariables(TRIGGER_FEED);

        const initialLoads = [
            this.prepareScorers(),
            MastoApi.instance.fetchHomeFeed(
                this.lockedMergeTootsToFeed.bind(this),
                Config.numDesiredTimelineToots,
                this.mostRecentHomeTootAt()
            ),
        ];

        // Delay the trending tag etc. toot pulls a bit because they generate a ton of API calls
        await new Promise(r => setTimeout(r, Config.hashtagTootRetrievalDelaySeconds * 1000));

        const secondaryLoads = [
            this.fetchAndMergeToots(getParticipatedHashtagToots),
            this.fetchAndMergeToots(getRecentTootsForTrendingTags),
            this.fetchAndMergeToots(MastodonServer.fediverseTrendingToots.bind(MastodonServer)),
            // Population of instance variables - these are not required to be done before the feed is loaded
            MastodonServer.getMastodonInstancesInfo().then((servers) => this.mastodonServers = servers),
            MastodonServer.getTrendingData().then((trendingData) => this.trendingData = trendingData),
            MastoApi.instance.getUserData().then((userData) => this.userData = userData),
        ]

        await Promise.all([...initialLoads, ...secondaryLoads]);
        this.finishFeedUpdate();
    }

    // Return the current filtered timeline feed in weight order
    getTimeline(): Toot[] {
        return this.filterFeedAndSetInApp();
    }

    // Return the user's current weightings for each score category
    async getUserWeights(): Promise<Weights> {
        return await Storage.getWeightings();
    }

    // TODO: Using loadingStatus as the main determinant of state is kind of janky
    isLoading(): boolean {
        return !!(this.loadingStatus && this.loadingStatus != READY_TO_LOAD_MSG)
    }

    // Apparently if the mutex lock is inside mergeTootsToFeed() then the state of this.feed is not consistent
    // which can result in toots getting lost as threads try to merge newToots into different this.feed states.
    // Wrapping the entire function in a mutex seems to fix this (though i'm not sure why).
    async lockedMergeTootsToFeed(newToots: Toot[], logPrefix: string): Promise<void> {
        newToots = filterWithLog<Toot>(newToots, t => t.isValidForFeed(), logPrefix, 'invalid', 'Toot');
        const releaseMutex = await lockExecution(this.mergeMutex, logPrefix);

        try {
            await this._mergeTootsToFeed(newToots, logPrefix);
        } finally {
            releaseMutex();
        }
    };

    // Return the timestamp of the most recent toot from followed accounts ONLY
    mostRecentHomeTootAt(): Date | null {
        return mostRecentTootedAt(this.homeTimelineToots());
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
        this.loadingStatus = READY_TO_LOAD_MSG;
        this.loadStartedAt = null;
        this.mastodonServers = {};
        this.catchupCheckpoint = null;
        this.feed = [];
        await Storage.clearAll();
        await this.loadCachedData();
        MastoApi.instance.setSemaphoreConcurrency(Config.maxConcurrentRequestsInitial);
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
        const followedAccountToots = this.feed.filter(toot => toot.isFollowed);

        if (!followedAccountToots.length && this.feed.length) {
            console.warn(`no followed account toots in feed with ${this.feed.length} toots!`);
        }

        return followedAccountToots;
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
            Config.backgroundLoadIntervalMS
        );
    }

    // Load cached data from storage. This is called when the app is first opened and when reset() is called.
    private async loadCachedData(): Promise<void> {
        this.feed = await Storage.getCoerced<Toot>(StorageKey.TIMELINE);
        this.filters = await Storage.getFilters() ?? buildNewFilterSettings();
        this.trendingData = await Storage.getTrending();
        this.userData = await Storage.loadUserData();
        this.setTimelineInApp(this.feed);
        console.log(`[fedialgo] loaded ${this.feed.length} timeline toots from cache, trendingData`);
    }

    // Log a message with the current state of the state variables
    // TODO: should be private, public for debugging for now
    logWithState(prefix: string, msg: string): void {
        console.log(`${prefix} ${msg}. state:`, this.statusDict());
    }

    // Merge a new batch of toots into the feed.
    // Mutates this.feed and returns whatever newToots are retrieve by tooFetcher()
    private async fetchAndMergeToots(tootFetcher: () => Promise<Toot[]>): Promise<Toot[]> {
        const logPrefix = `fetchAndMergeToots() ${tootFetcher.name}`;
        const startedAt = new Date();
        let newToots: Toot[] = [];
        traceLog(`${logPrefix} started fetching toots...`);

        try {
            newToots = await tootFetcher();
        } catch (e) {
            MastoApi.throwIfAccessTokenRevoked(e, `${logPrefix} Error fetching toots ${ageString(startedAt)}`);
        }

        const logTootsStr = () => `${newToots.length} toots ${ageString(startedAt)}`;
        logInfo(logPrefix, `${TELEMETRY} fetched ${logTootsStr()}`);
        await this.lockedMergeTootsToFeed(newToots, logPrefix);
        return newToots; // TODO: unused return value
    }

    // Merge newToots into this.feed, score, and filter the feed.
    // Don't call this directly, use lockedMergeTootsToFeed() instead.
    private async _mergeTootsToFeed(newToots: Toot[], logPrefix: string): Promise<void> {
        const numTootsBefore = this.feed.length;  // Good log filter for seeing the issue
        const startedAt = new Date();
        this.feed = Toot.dedupeToots([...this.feed, ...newToots], logPrefix);
        updatePropertyFilterOptions(this.filters, this.feed, await MastoApi.instance.getUserData());

        // TODO: Moving scoring outside the mutex means that sometimes the feed gets filtered before
        // everything is scored. This is probably OK but for now it throws warnings in the console.
        await this.scoreAndFilterFeed();
        logInfo(logPrefix, `${TELEMETRY} merge ${newToots.length} complete ${ageString(startedAt)}, numTootsBefore: ${numTootsBefore}, state:`, this.statusDict());
        this.setLoadingStateVariables(logPrefix);
    }

    // Prepare the scorers for scoring. If 'force' is true, force them to recompute data even if they are already ready.
    private async prepareScorers(force?: boolean): Promise<void> {
        const releaseMutex = await lockExecution(this.scoreMutex, PREP_SCORERS);

        try {
            if (force || this.featureScorers.some(scorer => !scorer.isReady)) {
                const startedAt = new Date();
                await Promise.all(this.featureScorers.map(scorer => scorer.fetchRequiredData()));
                logInfo(TELEMETRY, `${PREP_SCORERS} ready in ${ageString(startedAt)}`);
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
        await this.prepareScorers();  // Make sure the scorers are ready to go
        this.feed = await Scorer.scoreToots(this.feed, this.featureScorers, this.feedScorers);
        this.feed = truncateToConfiguredLength(this.feed, "maxCachedTimelineToots");
        await Storage.set(StorageKey.TIMELINE, this.feed);
        return this.filterFeedAndSetInApp();
    }

    // The "load is finished" version of setLoadingStateVariables(). // TODO: there's too many state variables
    private finishFeedUpdate(): void {
        this.loadingStatus = null;
        console.log(`${TRIGGER_FEED} finishFeedUpdate(), loadingStatus=${this.loadingStatus}...`);

        if (this.loadStartedAt) {
            logInfo(TELEMETRY, `Finished home TL load w/ ${this.feed.length} toots ${ageString(this.loadStartedAt)}`);
            this.lastLoadTimeInSeconds = ageInSeconds(this.loadStartedAt);
        } else {
            console.warn(`[${TELEMETRY}] FINISHED LOAD... but loadStartedAt is null!`);
            this.lastLoadTimeInSeconds = null;
        }

        this.catchupCheckpoint = null;
        this.loadStartedAt = null;
        this.launchBackgroundPoller();
        MastoApi.instance.setSemaphoreConcurrency(Config.maxConcurrentRequestsBackground);
    }

    // sets this.loadingStatus to a message indicating the current state of the feed
    private setLoadingStateVariables(logPrefix: string): void {
        if (logPrefix == TRIGGER_FEED) this.loadStartedAt = new Date();
        logPrefix += ` setLoadingStateVariables()`;
        console.log(`${logPrefix}) called...`);

        // If there's no toots in the feed then it's an initial load.
        if (!this.feed.length) {
            this.loadingStatus = INITIAL_LOAD_STATUS;
            return;
        }

        const mostRecentHomeTootAt = this.mostRecentHomeTootAt();

        // If there's no maxId but there is already an existing feed array that means it's a refresh
        if (!mostRecentHomeTootAt) {
            // Don't set this.catchupCheckpoint before timelineCutoffAt() (the earliest date we'd want to pull from)
            if (mostRecentHomeTootAt! < timelineCutoffAt()) {
                console.warn(`${logPrefix} most recent toot ${mostRecentHomeTootAt} older than cutoff`);
                this.catchupCheckpoint = timelineCutoffAt();
            } else {
                console.log(`${logPrefix} setting catchupCheckpoint to ${mostRecentHomeTootAt}`);
                this.catchupCheckpoint = mostRecentHomeTootAt;
            }

            this.loadingStatus = `new toots since ${timeString(this.catchupCheckpoint)}`;
        } else {
            this.loadingStatus = `more toots (retrieved ${this.feed.length.toLocaleString()} toots so far`;

            if (this.feed.length < Config.numDesiredTimelineToots) {
                this.loadingStatus += `, want ${Config.numDesiredTimelineToots.toLocaleString()}`;
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
    READY_TO_LOAD_MSG,
    extractDomain,
    timeString,
};
