/*
 * Main class that handles scoring and sorting a feed made of Toot objects.
 */
import 'reflect-metadata'; // Required for class-transformer
import { Buffer } from 'buffer'; // Maybe Required for class-transformer though seems to be required in client?
import { mastodon } from "masto";
import { Mutex } from 'async-mutex';

import Account from './api/objects/account';
import AlreadyShownScorer from './scorer/toot/already_shown_scorer';
import AuthorFollowersScorer from './scorer/toot/author_followers_scorer';
import BooleanFilter from "./filters/boolean_filter";
import ChaosScorer from "./scorer/toot/chaos_scorer";
import DiversityFeedScorer from "./scorer/feed/diversity_feed_scorer";
import FavouritedTagsScorer from './scorer/toot/favourited_tags_scorer';
import FollowedAccountsScorer from './scorer/toot/followed_accounts_scorer';
import FollowedTagsScorer from "./scorer/toot/followed_tags_scorer";
import FollowersScorer from './scorer/toot/followers_scorer';
import HashtagParticipationScorer from "./scorer/toot/hashtag_participation_scorer";
import ImageAttachmentScorer from "./scorer/toot/image_attachment_scorer";
import InteractionsScorer from "./scorer/toot/interactions_scorer";
import MastoApi, { FULL_HISTORY_PARAMS } from "./api/api";
import MastodonServer from './api/mastodon_server';
import MentionsFollowedScorer from './scorer/toot/mentions_followed_scorer';
import MostFavouritedAccountsScorer from "./scorer/toot/most_favourited_accounts_scorer";
import MostRepliedAccountsScorer from "./scorer/toot/most_replied_accounts_scorer";
import MostRetootedAccountsScorer from "./scorer/toot/most_retooted_accounts_scorer";
import NumericFilter from './filters/numeric_filter';
import NumFavouritesScorer from "./scorer/toot/num_favourites_scorer";
import NumRepliesScorer from "./scorer/toot/num_replies_scorer";
import NumRetootsScorer from "./scorer/toot/num_retoots_scorer";
import RetootsInFeedScorer from "./scorer/toot/retoots_in_feed_scorer";
import Scorer from "./scorer/scorer";
import ScorerCache from './scorer/scorer_cache';
import Storage, {  } from "./Storage";
import TagList from './api/tag_list';
import Toot, { earliestTootedAt, mostRecentTootedAt } from './api/objects/toot';
import TagsForFetchingToots from "./api/tags_for_fetching_toots";
import TrendingLinksScorer from './scorer/toot/trending_links_scorer';
import TrendingTagsScorer from "./scorer/toot/trending_tags_scorer";
import TrendingTootScorer from "./scorer/toot/trending_toots_scorer";
import UserData from "./api/user_data";
import VideoAttachmentScorer from "./scorer/toot/video_attachment_scorer";
import type FeedScorer from './scorer/feed_scorer';
import type TootScorer from './scorer/toot_scorer';
import { ageInHours, ageInSeconds, ageInMinutes, ageString, timeString, toISOFormatIfExists } from './helpers/time_helpers';
import { buildNewFilterSettings, updateBooleanFilterOptions } from "./filters/feed_filters";
import { config, MAX_ENDPOINT_RECORDS_TO_PULL, SECONDS_IN_MINUTE } from './config';
import { FEDIALGO, GIFV, VIDEO_TYPES, extractDomain, optionalSuffix } from './helpers/string_helpers';
import { getMoarData, moarDataLogger } from "./api/moar_data_poller";
import { isAccessTokenRevokedError, throwIfAccessTokenRevoked, throwSanitizedRateLimitError } from './api/errors';
import { isDebugMode, isQuickMode } from './helpers/environment_helpers';
import { lockExecution } from './helpers/mutex_helpers';
import { Logger } from './helpers/logger';
import { rechartsDataPoints } from "./helpers/stats_helper";
import { WEIGHT_PRESETS, WeightPresetLabel, isWeightPresetLabel, type WeightPresets } from './scorer/weight_presets';
import { type ObjList } from "./api/counted_list";
import {
    AlgorithmStorageKey,
    BooleanFilterName,
    CacheKey,
    LoadAction,
    LogAction,
    MediaCategory,
    NonScoreWeightName,
    ScoreName,
    TrendingType,
    TypeFilterName,
    TagTootsCategory,
    ALL_ACTIONS,
    JUST_MUTING,
    // LOG_KEYS,
    buildCacheKeyDict,
    isValueInStringEnum,
    type Action,
    type ApiCacheKey,
} from "./enums";
import {
    computeMinMax,
    makeChunks,
    makePercentileChunks,
    sortKeysByValue,
    truncateToLength,
} from "./helpers/collection_helpers";
import {
    FILTER_OPTION_DATA_SOURCES,
    type BooleanFilterOption,
    type ConcurrencyLockRelease,
    type FeedFilterSettings,
    type FilterOptionDataSource,
    type KeysOfValueType,
    type MastodonInstance,
    type MastodonTag,
    type MinMaxAvgScore,
    type ScoreStats,
    type StringNumberDict,
    type TagWithUsageCounts,
    type TrendingData,
    type TrendingLink,
    type TrendingObj,
    type TrendingWithHistory,
    type WeightInfoDict,
    type WeightName,
    type Weights,
} from "./types";

const EMPTY_TRENDING_DATA: TrendingData = {
    links: [],
    tags: new TagList([], TagTootsCategory.TRENDING),
    servers: {},
    toots: []
};

const DEFAULT_SET_TIMELINE_IN_APP = (_feed: Toot[]) => console.debug(`Default setTimelineInApp() called`);

const logger = new Logger(`TheAlgorithm`);

const loggers: Record<Action | ApiCacheKey, Logger> = buildCacheKeyDict<Action, Logger, Record<Action, Logger>>(
    (key) => new Logger(key as string),
    ALL_ACTIONS.reduce(
        (_loggers, action) => {
            _loggers[action] = logger.tempLogger(action);
            return _loggers;
        },
        {} as Record<Action, Logger>
    )
);

interface AlgorithmArgs {
    api: mastodon.rest.Client;
    user: mastodon.v1.Account;
    locale?: string;  // Optional locale to use for date formatting
    setTimelineInApp?: (feed: Toot[]) => void;  // Optional callback to set the feed in the code using this package
};


/**
 * Main class for scoring, sorting, and managing a Mastodon feed made of Toot objects.
 *
 * TheAlgorithm orchestrates fetching, scoring, filtering, and updating the user's timeline/feed.
 * It manages feature and feed scorers, trending data, filters, user weights, and background polling.
 *
 * Key responsibilities:
 * - Fetches and merges toots from multiple sources (home timeline, trending, hashtags, etc.)
 * - Applies scoring algorithms and user-defined weights to rank toots
 * - Filters the feed based on user settings and filter options
 * - Handles background polling for new data and saving state to storage
 * - Provides methods for updating filters, weights, and retrieving current state
 * - Exposes utility methods for stats, server info, and tag URLs
 *
 * @property {string[]} apiErrorMsgs - API error messages
 * @property {FeedFilterSettings} filters - Current filter settings for the feed
 * @property {boolean} isLoading - Whether a feed load is in progress*
 * @property {number} [lastLoadTimeInSeconds] - Duration of the last load in seconds
 * @property {string | null} loadingStatus - String describing load activity
 * @property {Toot[]} timeline - The current filtered timeline
 * @property {TrendingData} trendingData - Trending data (links, tags, servers, toots)
 * @property {UserData} userData - User data for scoring and filtering
 * @property {WeightInfoDict} weightsInfo - Info about all scoring weights
 */
export default class TheAlgorithm {
    /**
     * True if FEDIALGO_DEBUG environment var was set at compile time.
     * @returns {boolean}
     */
    static get isDebugMode(): boolean { return isDebugMode };
    /**
     * Dictionary of preset weight configurations for scoring.
     * @returns {WeightPresets}
     */
    static get weightPresets(): WeightPresets { return WEIGHT_PRESETS };

    filters: FeedFilterSettings = buildNewFilterSettings();
    lastLoadTimeInSeconds?: number;
    loadingStatus: string | null = config.locale.messages[LogAction.INITIAL_LOADING_STATUS];
    trendingData: TrendingData = EMPTY_TRENDING_DATA;

    get apiErrorMsgs(): string[] { return MastoApi.instance.apiErrors.map(e => e.message) };
    get isLoading(): boolean { return this.loadingMutex.isLocked() };
    get timeline(): Toot[] { return [...this.feed] };
    get userData(): UserData { return MastoApi.instance.userData || new UserData() };

    // Constructor arguments
    private setTimelineInApp: (feed: Toot[]) => void;  // Optional callback to set the feed in the app using this package
    // Other private variables
    private feed: Toot[] = [];
    private homeFeed: Toot[] = [];  // Just the toots pulled from the home timeline
    private hasProvidedAnyTootsToClient = false;  // Flag to indicate if the feed has been set in the app
    private loadStartedAt?: Date;  // Timestamp of when the feed started loading
    private totalNumTimesShown = 0;  // Sum of timeline toots' numTimesShown
    // Utility
    private loadingMutex = new Mutex();
    private mergeMutex = new Mutex();
    private numTriggers = 0;  // How many times has a load been triggered, only matters for QUICK_LOAD mode
    private _releaseLoadingMutex?: ConcurrencyLockRelease;  // Mutex release function for loading state
    // Background tasks
    private cacheUpdater?: ReturnType<typeof setInterval>;
    private dataPoller?: ReturnType<typeof setInterval>;

    // These scorers require the complete feed to work properly
    private feedScorers: FeedScorer[] = [
        new DiversityFeedScorer(),
    ];

    // These can score a toot without knowing about the rest of the toots in the feed
    private tootScorers: TootScorer[] = [
        new AlreadyShownScorer(),
        new AuthorFollowersScorer(),
        new ChaosScorer(),
        new FavouritedTagsScorer(),
        new FollowedAccountsScorer(),
        new FollowedTagsScorer(),
        new FollowersScorer(),
        new HashtagParticipationScorer(),
        new ImageAttachmentScorer(),
        new InteractionsScorer(),
        new MentionsFollowedScorer(),
        new MostFavouritedAccountsScorer(),
        new MostRepliedAccountsScorer(),
        new MostRetootedAccountsScorer(),
        new NumFavouritesScorer(),
        new NumRepliesScorer(),
        new NumRetootsScorer(),
        new RetootsInFeedScorer(),
        new TrendingLinksScorer(),
        new TrendingTagsScorer(),
        new TrendingTootScorer(),
        new VideoAttachmentScorer(),
    ];

    private weightedScorers: Scorer[] = [
        ...this.tootScorers,
        ...this.feedScorers,
    ];

    weightsInfo: WeightInfoDict = this.weightedScorers.reduce(
        (scorerInfos, scorer) => {
            scorerInfos[scorer.name] = scorer.getInfo();
            return scorerInfos;
        },
        Object.values(NonScoreWeightName).reduce(
            (nonScoreWeights, weightName) => {
                nonScoreWeights[weightName] = Object.assign({}, config.scoring.nonScoreWeightsConfig[weightName]);
                nonScoreWeights[weightName].minValue = config.scoring.nonScoreWeightMinValue;
                return nonScoreWeights;
            },
            {} as WeightInfoDict
        )
    );

    /**
     * Publicly callable constructor that instantiates the class and loads the feed from storage.
     * @param {AlgorithmArgs} params - The parameters for algorithm creation.
     * @param {mastodon.rest.Client} params.api - The Mastodon REST API client instance.
     * @param {mastodon.v1.Account} params.user - The Mastodon user account for which to build the feed.
     * @param {string} [params.locale] - Optional locale string for date formatting.
     * @param {(feed: Toot[]) => void} [params.setTimelineInApp] - Optional callback to set the feed in the consuming app.
     * @returns {Promise<TheAlgorithm>} TheAlgorithm instance.
     */
    static async create(params: AlgorithmArgs): Promise<TheAlgorithm> {
        config.setLocale(params.locale);
        const user = Account.build(params.user);
        await MastoApi.init(params.api, user);
        await Storage.logAppOpen(user);

        // Construct the algorithm object, set the default weights, load feed and filters
        const algo = new TheAlgorithm(params);
        ScorerCache.addScorers(algo.tootScorers, algo.feedScorers);
        await algo.loadCachedData();
        return algo;
    }

    /**
     * Private constructor for TheAlgorithm. Use TheAlgorithm.create() to instantiate.
     * @param {AlgorithmArgs} params - Constructor params (API client, user, and optional timeline callback/locale).
     */
    private constructor(params: AlgorithmArgs) {
        this.setTimelineInApp = params.setTimelineInApp ?? DEFAULT_SET_TIMELINE_IN_APP;
    }

    /**
     * Trigger the retrieval of the user's timeline from all the sources.
     * @returns {Promise<void>}
     */
    async triggerFeedUpdate(): Promise<void> {
        if (this.shouldSkip()) return;
        const action = LoadAction.TRIGGER_FEED_UPDATE;
        const hereLogger = loggers[action];
        await this.startAction(action);

        try {
            const tootsForHashtags = async (key: TagTootsCategory): Promise<Toot[]> => {
                hereLogger.trace(`Fetching toots for hashtags with key: ${key}`);
                const tagList = await TagsForFetchingToots.create(key);
                return await this.fetchAndMergeToots(tagList.getToots(), tagList.logger);
            };

            const dataLoads: Promise<unknown>[] = [
                // Toot fetchers
                this.getHomeTimeline().then((toots) => this.homeFeed = toots),
                this.fetchAndMergeToots(MastoApi.instance.getHomeserverToots(), loggers[CacheKey.HOMESERVER_TOOTS]),
                this.fetchAndMergeToots(MastodonServer.fediverseTrendingToots(), loggers[CacheKey.FEDIVERSE_TRENDING_TOOTS]),
                ...Object.values(TagTootsCategory).map(async (key) => await tootsForHashtags(key)),
                // Other data fetchers
                MastodonServer.getTrendingData().then((trendingData) => this.trendingData = trendingData),
                MastoApi.instance.getUserData(),
                ScorerCache.prepareScorers(),
            ];

            const allResults = await Promise.allSettled(dataLoads);
            hereLogger.deep(`FINISHED promises, allResults:`, allResults);
            await this.finishFeedUpdate();
        } finally {
            this.releaseLoadingMutex(action);
        }
    }

    /**
     * Trigger the loading of additional toots, farther back on the home timeline.
     * @returns {Promise<void>}
     */
    async triggerHomeTimelineBackFill(): Promise<void> {
        await this.startAction(LoadAction.TRIGGER_TIMELINE_BACKFILL);

        try {
            this.homeFeed = await this.getHomeTimeline(true);
            await this.finishFeedUpdate();
        } finally {
            this.releaseLoadingMutex(LoadAction.TRIGGER_TIMELINE_BACKFILL);
        }
    }

    /**
     * Manually trigger the loading of "moar" user data (recent toots, favourites, notifications, etc).
     * Usually done by a background task on a set interval.
     * @returns {Promise<void>}
     */
    async triggerMoarData(): Promise<void> {
        await this.startAction(LoadAction.TRIGGER_MOAR_DATA);
        let shouldReenablePoller = false;

        try {
            if (this.dataPoller) {
                moarDataLogger.log(`Disabling current data poller...`);
                this.dataPoller && clearInterval(this.dataPoller!);   // Stop the dataPoller if it's running
                this.dataPoller = undefined;
                shouldReenablePoller  = true;
            }

            await getMoarData();
            await this.recomputeScorers();
        } catch (error) {
            throwSanitizedRateLimitError(error, `triggerMoarData() Error pulling user data:`);
        } finally {
            if (shouldReenablePoller) this.enableMoarDataBackgroundPoller();  // Reenable poller when finished
            this.releaseLoadingMutex(LoadAction.TRIGGER_MOAR_DATA);
        }
    }

    /**
     * Collect *ALL* the user's history data from the server - past toots, favourites, etc.
     * Use with caution!
     * @returns {Promise<void>}
     */
    async triggerPullAllUserData(): Promise<void> {
        const action = LoadAction.TRIGGER_PULL_ALL_USER_DATA;
        const hereLogger = loggers[action];
        this.startAction(action);

        try {
            this.dataPoller && clearInterval(this.dataPoller!);   // Stop the dataPoller if it's running

            const _allResults = await Promise.allSettled([
                MastoApi.instance.getFavouritedToots(FULL_HISTORY_PARAMS),
                // TODO: there's just too many notifications to pull all of them
                MastoApi.instance.getNotifications({maxRecords: MAX_ENDPOINT_RECORDS_TO_PULL, moar: true}),
                MastoApi.instance.getRecentUserToots(FULL_HISTORY_PARAMS),
            ]);

            await this.recomputeScorers();
        } catch (error) {
            throwSanitizedRateLimitError(error, hereLogger.line(`Error pulling user data:`));
        } finally {
            this.releaseLoadingMutex(action);  // TODO: should we restart data poller?
        }
    }

    /**
     * Return an object describing the state of the world. Mostly for debugging.
     * @returns {Promise<Record<string, any>>} State object.
     */
    async getCurrentState(): Promise<Record<string, unknown>> {
        return {
            Algorithm: this.statusDict(),
            Api: MastoApi.instance.currentState(),
            Config: config,
            Filters: this.filters,
            Homeserver: await this.serverInfo(),
            Storage: await Storage.storedObjsInfo(),
            Trending: this.trendingData,
            UserData: await MastoApi.instance.getUserData(),
        };
    }

    /**
     * Build array of objects suitable for charting timeline scoring data by quintile/decile/etc. with Recharts.
     * @param {number} numPercentiles - Number of percentiles for stats.
     * @returns {object[]} Recharts data points.
     */
    getRechartsStatsData(numPercentiles: number): object[] {
        return rechartsDataPoints(this.feed, numPercentiles);
    }

    /**
     * Return the user's current weightings for each score category.
     * @returns {Promise<Weights>} The user's weights.
     */
    async getUserWeights(): Promise<Weights> {
        return await Storage.getWeights();
    }

    /**
     * Return the timestamp of the most recent toot from followed accounts + hashtags ONLY.
     * @returns {Date | null} The most recent toot date or null.
     */
    mostRecentHomeTootAt(): Date | null {
        // TODO: this.homeFeed is only set when fetchHomeFeed() is *finished*
        if (this.homeFeed.length == 0 && this.numTriggers > 1) {
            logger.warn(`mostRecentHomeTootAt() homeFeed is empty, falling back to full feed`);
            return mostRecentTootedAt(this.feed);
        }

        return mostRecentTootedAt(this.homeFeed);
    }

    /**
     * Return the number of seconds since the most recent home timeline toot.
     * @returns {number | null} Age in seconds or null.
     */
    mostRecentHomeTootAgeInSeconds(): number | null {
        const mostRecentAt = this.mostRecentHomeTootAt();
        if (!mostRecentAt) return null;
        logger.trace(`feed is ${ageInMinutes(mostRecentAt).toFixed(2)} mins old, most recent home toot: ${timeString(mostRecentAt)}`);
        return ageInSeconds(mostRecentAt);
    }

    /**
     * Pull the latest list of muted accounts from the server and use that to filter any newly muted accounts
     * out of the timeline.
     * @returns {Promise<void>}
     */
    async refreshMutedAccounts(): Promise<void> {
        const hereLogger = loggers[LoadAction.REFRESH_MUTED_ACCOUNTS];
        hereLogger.log(`called (${Object.keys(this.userData.mutedAccounts).length} current muted accounts)...`);
        // TODO: move refreshMutedAccounts() to UserData class?
        const mutedAccounts = await MastoApi.instance.getMutedAccounts({bustCache: true});
        hereLogger.log(`Found ${mutedAccounts.length} muted accounts after refresh...`);
        this.userData.mutedAccounts = Account.buildAccountNames(mutedAccounts);
        await Toot.completeToots(this.feed, hereLogger, JUST_MUTING);
        await this.finishFeedUpdate();
    }

    /**
     * Clear everything from browser storage except the user's identity and weightings (unless complete is true).
     * @param {boolean} [complete=false] - If true, remove user data as well.
     * @returns {Promise<void>}
     */
    async reset(complete: boolean = false): Promise<void> {
        await this.startAction(LoadAction.RESET);

        try {
            this.dataPoller && clearInterval(this.dataPoller!);
            this.dataPoller = undefined;
            this.cacheUpdater && clearInterval(this.cacheUpdater!);
            this.cacheUpdater = undefined;
            this.hasProvidedAnyTootsToClient = false;
            this.loadingStatus = config.locale.messages[LogAction.INITIAL_LOADING_STATUS];
            this.loadStartedAt = undefined;
            this.numTriggers = 0;
            this.trendingData = EMPTY_TRENDING_DATA;
            this.feed = [];
            this.setTimelineInApp([]);

            // Call other classes' reset methods
            MastoApi.instance.reset();
            ScorerCache.resetScorers();
            await Storage.clearAll();

            if (complete) {
                await Storage.remove(AlgorithmStorageKey.USER);  // Remove user data so it gets reloaded
            } else {
                await this.loadCachedData();
            }
        } finally {
            this.releaseLoadingMutex(LoadAction.RESET);
        }
    }

    /**
     * Save the current timeline to the browser storage. Used to save the state of toots' numTimesShown.
     * @returns {Promise<void>}
     */
    async saveTimelineToCache(): Promise<void> {
        const newTotalNumTimesShown = this.feed.reduce((sum, toot) => sum + (toot.numTimesShown ?? 0), 0);
        if (this.isLoading || (this.totalNumTimesShown == newTotalNumTimesShown)) return;
        const hereLogger = logger.tempLogger(`saveTimelineToCache`);

        try {
            const numShownToots = this.feed.filter(toot => toot.numTimesShown).length;
            const msg = `Saving ${this.feed.length} toots with ${newTotalNumTimesShown} times shown` +
                `on ${numShownToots} toots (previous totalNumTimesShown: ${this.totalNumTimesShown})`;
            hereLogger.debug(msg);
            await Storage.set(AlgorithmStorageKey.TIMELINE_TOOTS, this.feed);
            this.totalNumTimesShown = newTotalNumTimesShown;
        } catch (error) {
            hereLogger.error(`Error saving toots:`, error);
        }
    }

    /**
     * Return info about the Fedialgo user's home mastodon instance.
     * @returns {Promise<mastodon.v2.Instance>} Instance info.
     */
    async serverInfo(): Promise<mastodon.v2.Instance> {
        return await MastoApi.instance.instanceInfo();
    }

    /**
     * Get the URL for a tag on the user's home instance (aka "server").
     * @param {string | MastodonTag} tag - The tag or tag object.
     * @returns {string} The tag URL.
     */
    tagUrl(tag: string | MastodonTag): string {
        return MastoApi.instance.tagUrl(tag);
    }

    /**
     * Update the feed filters and return the newly filtered feed.
     * @param {FeedFilterSettings} newFilters - The new filter settings.
     * @returns {Toot[]} The filtered feed.
     */
    updateFilters(newFilters: FeedFilterSettings): Toot[] {
        logger.info(`updateFilters() called with newFilters:`, newFilters);
        this.filters = newFilters;
        Storage.setFilters(newFilters);
        return this.filterFeedAndSetInApp();
    }

    /**
     * Update user weightings and rescore / resort the feed.
     * @param {Weights} userWeights - The new user weights.
     * @returns {Promise<Toot[]>} The filtered and rescored feed.
     */
    async updateUserWeights(userWeights: Weights): Promise<Toot[]> {
        logger.info("updateUserWeights() called with weights:", userWeights);
        Scorer.validateWeights(userWeights);
        await Storage.setWeightings(userWeights);
        return this.scoreAndFilterFeed();
    }

    /**
     * Update user weightings to one of the preset values and rescore / resort the feed.
     * @param {WeightPresetLabel | string} presetName - The preset name.
     * @returns {Promise<Toot[]>} The filtered and rescored feed.
     */
    async updateUserWeightsToPreset(presetName: WeightPresetLabel | string): Promise<Toot[]> {
        logger.info("updateUserWeightsToPreset() called with presetName:", presetName);

        if (!isWeightPresetLabel(presetName)) {
            logger.logAndThrowError(`Invalid weight preset: "${presetName}"`);
        }

        return await this.updateUserWeights(WEIGHT_PRESETS[presetName as WeightPresetLabel]);
    }

    ///////////////////////////////
    //      Private Methods      //
    ///////////////////////////////

    // Return true if we're in QUICK_MODE and the feed is fresh enough that we don't need to update it (for dev)
    private shouldSkip(): boolean {
        const hereLogger = loggers[LoadAction.TRIGGER_FEED_UPDATE];
        hereLogger.info(`${++this.numTriggers} triggers so far, state:`, this.statusDict());
        let feedAgeInMinutes = this.mostRecentHomeTootAgeInSeconds();
        if (feedAgeInMinutes) feedAgeInMinutes /= 60;
        const maxAgeMinutes = config.minTrendingMinutesUntilStale();

        if (isQuickMode && feedAgeInMinutes && feedAgeInMinutes < maxAgeMinutes && this.numTriggers <= 1) {
            hereLogger.debug(`QUICK_MODE Feed's ${feedAgeInMinutes.toFixed(0)}s old, skipping`);
            // Needs to be called to update the feed in the app
            ScorerCache.prepareScorers().then((_t) => this.filterFeedAndSetInApp());
            return true;
        } else {
            return false;
        }
    }

    // Merge a new batch of toots into the feed.
    // Mutates this.feed and returns whatever newToots are retrieve by tooFetcher()
    private async fetchAndMergeToots(tootFetcher: Promise<Toot[]>, logger: Logger): Promise<Toot[]> {
        const startedAt = new Date();
        let newToots: Toot[] = [];

        try {
            newToots = await tootFetcher;
            logger.logTelemetry(`Got ${newToots.length} toots for ${CacheKey.HOME_TIMELINE_TOOTS}`, startedAt);
        } catch (e) {
            throwIfAccessTokenRevoked(logger, e, `Error fetching toots ${ageString(startedAt)}`);
        }

        await this.lockedMergeToFeed(newToots, logger);
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
            logger.logTelemetry(`First ${filteredFeed.length} toots sent to client`, this.loadStartedAt);
        }

        return filteredFeed;
    }

    // Do some final cleanup and scoring operations on the feed.
    private async finishFeedUpdate(): Promise<void> {
        const action = LogAction.FINISH_FEED_UPDATE;
        const hereLogger = loggers[action];
        this.loadingStatus = config.locale.messages[action];

        // Now that all data has arrived go back over the feed and do the slow calculations of trendingLinks etc.
        hereLogger.debug(`${this.loadingStatus}...`);
        await Toot.completeToots(this.feed, hereLogger);
        this.feed = await Toot.removeInvalidToots(this.feed, hereLogger);
        await updateBooleanFilterOptions(this.filters, this.feed, true);
        await this.scoreAndFilterFeed();

        if (this.loadStartedAt) {
            hereLogger.logTelemetry(`finished home TL load w/ ${this.feed.length} toots`, this.loadStartedAt);
            this.lastLoadTimeInSeconds = ageInSeconds(this.loadStartedAt);
        } else {
            hereLogger.warn(`finished but loadStartedAt is null!`);
        }

        this.loadStartedAt = undefined;
        this.loadingStatus = null;
        this.launchBackgroundPollers();
    }

    // Simple wrapper for triggering fetchHomeFeed()
    private async getHomeTimeline(moreOldToots?: boolean): Promise<Toot[]> {
        return await MastoApi.instance.fetchHomeFeed({
            mergeTootsToFeed: this.lockedMergeToFeed.bind(this),
            moar: moreOldToots
        });
    }

    // Kick off the MOAR data poller to collect more user history data if it doesn't already exist
    // as well as the cache updater that saves the current state of the timeline toots' alreadyShown to storage
    private launchBackgroundPollers(): void {
        this.enableMoarDataBackgroundPoller();

        // The cache updater writes the current state of the feed to storage every few seconds
        // to capture changes to the alreadyShown state of toots.
        if (this.cacheUpdater) {
            moarDataLogger.trace(`cacheUpdater already exists, not starting another one`);
            return;
        }

        this.cacheUpdater = setInterval(
            async () => await this.saveTimelineToCache(),
            config.toots.saveChangesIntervalSeconds * 1000
        );
    }

    // Load cached data from storage. This is called when the app is first opened and when reset() is called.
    private async loadCachedData(): Promise<void> {
        this.homeFeed = await Storage.getCoerced<Toot>(CacheKey.HOME_TIMELINE_TOOTS);
        this.feed = await Storage.getCoerced<Toot>(AlgorithmStorageKey.TIMELINE_TOOTS);

        if (this.feed.length == config.toots.maxTimelineLength) {
            const numToClear = config.toots.maxTimelineLength - config.toots.truncateFullTimelineToLength;
            logger.info(`Timeline cache is full (${this.feed.length}), discarding ${numToClear} old toots`);
            this.feed = truncateToLength(this.feed, config.toots.truncateFullTimelineToLength, logger);
            await Storage.set(AlgorithmStorageKey.TIMELINE_TOOTS, this.feed);
        }

        this.trendingData = await Storage.getTrendingData();
        this.filters = await Storage.getFilters() ?? buildNewFilterSettings();
        await updateBooleanFilterOptions(this.filters, this.feed, true);
        this.setTimelineInApp(this.feed);
        logger.log(`<loadCachedData()> loaded ${this.feed.length} timeline toots from cache, trendingData`);
    }

    // Apparently if the mutex lock is inside mergeTootsToFeed() then the state of this.feed is not consistent
    // which can result in toots getting lost as threads try to merge newToots into different this.feed states.
    // Wrapping the entire function in a mutex seems to fix this (though i'm not sure why).
    private async lockedMergeToFeed(newToots: Toot[], logger: Logger): Promise<void> {
        const hereLogger = logger.tempLogger('lockedMergeToFeed');
        const releaseMutex = await lockExecution(this.mergeMutex, hereLogger);

        try {
            await this.mergeTootsToFeed(newToots, logger);
            hereLogger.trace(`Merged ${newToots.length} newToots, released mutex`);
        } finally {
            releaseMutex();
        }
    };

    // Throws an error if the feed is loading, otherwise lock the mutex and set the loadStartedAt timestamp.
    private async startAction(logPrefix: LoadAction): Promise<void> {
        const hereLogger = loggers[logPrefix];
        const status = config.locale.messages[logPrefix];
        hereLogger.log(`called, state:`, this.statusDict());

        if (this.isLoading) {
            hereLogger.warn(`Load in progress already!`, this.statusDict());
            throw new Error(config.locale.messages.isBusy);
        }

        this.loadStartedAt = new Date();
        this._releaseLoadingMutex = await lockExecution(this.loadingMutex, logger);

        if (typeof status === 'function') {
            this.loadingStatus = status(this.feed, this.mostRecentHomeTootAt());
        } else {
            this.loadingStatus = status;
        }
    }

    // Merge newToots into this.feed, score, and filter the feed.
    // NOTE: Don't call this directly! Use lockedMergeTootsToFeed() instead.
    private async mergeTootsToFeed(newToots: Toot[], inLogger: Logger): Promise<void> {
        const startedAt = new Date();
        const numTootsBefore = this.feed.length;
        this.feed = Toot.dedupeToots([...this.feed, ...newToots], inLogger.tempLogger('mergeTootsToFeed'));
        await updateBooleanFilterOptions(this.filters, this.feed);
        await this.scoreAndFilterFeed();
        inLogger.logTelemetry(`merged ${newToots.length} new toots into ${numTootsBefore} timeline toots`, startedAt);
        this.loadingStatus = config.locale.messages[LoadAction.TRIGGER_FEED_UPDATE](this.feed, this.mostRecentHomeTootAt());
    }

    // Recompute the scorers' computations based on user history etc. and trigger a rescore of the feed
    private async recomputeScorers(): Promise<void> {
        await MastoApi.instance.getUserData(true);  // Refresh user data
        await ScorerCache.prepareScorers(true);  // The "true" arg is the key here
        await this.scoreAndFilterFeed();
    }

    // Release the loading mutex and reset the loading state variables.
    private releaseLoadingMutex(logPrefix: LoadAction): void {
        this.loadingStatus = null;

        if (this._releaseLoadingMutex) {
            loggers[logPrefix].info(`Finished, releasing mutex...`);
            this._releaseLoadingMutex();
        } else {
            loggers[logPrefix].warn(`releaseLoadingMutex() called but no mutex to release!`);
        }
    }

    // Score the feed, sort it, save it to storage, and call filterFeed() to update the feed in the app
    // Returns the FILTERED set of toots (NOT the entire feed!)
    private async scoreAndFilterFeed(): Promise<Toot[]> {
        // await ScorerCache.prepareScorers();
        this.feed = await Scorer.scoreToots(this.feed, true);

        this.feed = truncateToLength(
            this.feed,
            config.toots.maxTimelineLength,
            logger.tempLogger('scoreAndFilterFeed()')
        );

        await Storage.set(AlgorithmStorageKey.TIMELINE_TOOTS, this.feed);
        return this.filterFeedAndSetInApp();
    }

    // Info about the state of this TheAlgorithm instance
    private statusDict(): Record<string, unknown> {
        const mostRecentTootAt = this.mostRecentHomeTootAt();
        const oldestTootAt = earliestTootedAt(this.homeFeed);
        let numHoursInHomeFeed: number | null = null;

        if (mostRecentTootAt && oldestTootAt) {
            numHoursInHomeFeed = ageInHours(oldestTootAt, mostRecentTootAt);
        }

        return {
            feedNumToots: this.feed.length,
            homeFeedNumToots: this.homeFeed.length,
            homeFeedMostRecentAt: toISOFormatIfExists(mostRecentTootAt),
            homeFeedOldestAt: toISOFormatIfExists(oldestTootAt),
            homeFeedTimespanHours: numHoursInHomeFeed ? Number(numHoursInHomeFeed.toPrecision(2)) : null,
            isLoading: this.isLoading,
            loadingStatus: this.loadingStatus,
            loadStartedAt: toISOFormatIfExists(this.loadStartedAt),
            minMaxScores: computeMinMax(this.feed, (toot) => toot.scoreInfo?.score),
        };
    }

    private enableMoarDataBackgroundPoller(): void {
        if (this.dataPoller) {
            moarDataLogger.trace(`Data poller already exists, not starting another one`);
            return;
        }

        this.dataPoller = setInterval(
            async () => {
                const shouldContinue = await getMoarData();
                await this.recomputeScorers();  // Force scorers to recompute data, rescore the feed

                if (!shouldContinue) {
                    moarDataLogger.log(`Stopping data poller...`);
                    this.dataPoller && clearInterval(this.dataPoller!);
                }
            },
            config.api.backgroundLoadIntervalMinutes * SECONDS_IN_MINUTE * 1000
        );
    }
};


// Some strings we want to export from the config
const GET_FEED_BUSY_MSG = config.locale.messages[LoadAction.IS_BUSY];
const READY_TO_LOAD_MSG = config.locale.messages[LogAction.INITIAL_LOADING_STATUS];

// Export types and constants needed by apps using this package
export {
    // Constants
    FILTER_OPTION_DATA_SOURCES,
    FEDIALGO,
    GET_FEED_BUSY_MSG,
    GIFV,
    READY_TO_LOAD_MSG,
    VIDEO_TYPES,
    // Classes
    Account,
    BooleanFilter,
    Logger,
    NumericFilter,
    TagList,
    Toot,
    // Enums
    BooleanFilterName,
    MediaCategory,
    NonScoreWeightName,
    ScoreName,
    TagTootsCategory,
    TrendingType,
    TypeFilterName,
    WeightName,
    // Helpers
    extractDomain,
    isAccessTokenRevokedError,
    isValueInStringEnum,
    makeChunks,
    makePercentileChunks,  // TODO: unused in demo app (for now)
    optionalSuffix,
    sortKeysByValue,
    timeString,
    // Types
    type BooleanFilterOption,
    type FeedFilterSettings,
    type FilterOptionDataSource,
    type KeysOfValueType,
    type MastodonInstance,
    type MinMaxAvgScore,
    type ObjList,
    type ScoreStats,
    type StringNumberDict,
    type TagWithUsageCounts,
    type TrendingData,
    type TrendingLink,
    type TrendingObj,
    type TrendingWithHistory,
    type Weights,
};
