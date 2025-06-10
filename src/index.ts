/*
 * Main class that handles scoring and sorting a feed made of Toot objects.
 */
import 'reflect-metadata'; // Required for class-transformer
import { Buffer } from 'buffer'; // Maybe Required for class-transformer though seems to be required in client?
import { mastodon } from "masto";
import { Mutex } from 'async-mutex';

import Account from './api/objects/account';
import AlreadyShownScorer from './scorer/feature/already_shown_scorer';
import AuthorFollowersScorer from './scorer/feature/author_followers_scorer';
import BooleanFilter, {  } from "./filters/boolean_filter";
import ChaosScorer from "./scorer/feature/chaos_scorer";
import DiversityFeedScorer from "./scorer/feed/diversity_feed_scorer";
import FavouritedTagsScorer from './scorer/feature/favourited_tags_scorer';
import FollowedAccountsScorer from './scorer/feature/followed_accounts_scorer';
import FollowedTagsScorer from "./scorer/feature/followed_tags_scorer";
import FollowersScorer from './scorer/feature/followers_scorer';
import HashtagParticipationScorer from "./scorer/feature/hashtag_participation_scorer";
import ImageAttachmentScorer from "./scorer/feature/image_attachment_scorer";
import InteractionsScorer from "./scorer/feature/interactions_scorer";
import MastoApi, { FULL_HISTORY_PARAMS, isAccessTokenRevokedError } from "./api/api";
import MastodonServer from './api/mastodon_server';
import MentionsFollowedScorer from './scorer/feature/mentions_followed_scorer';
import MostFavouritedAccountsScorer from "./scorer/feature/most_favourited_accounts_scorer";
import MostRepliedAccountsScorer from "./scorer/feature/most_replied_accounts_scorer";
import MostRetootedAccountsScorer from "./scorer/feature/most_retooted_accounts_scorer";
import NumericFilter from './filters/numeric_filter';
import NumFavouritesScorer from "./scorer/feature/num_favourites_scorer";
import NumRepliesScorer from "./scorer/feature/num_replies_scorer";
import NumRetootsScorer from "./scorer/feature/num_retoots_scorer";
import ObjWithCountList, { ObjList } from "./api/obj_with_counts_list";
import RetootsInFeedScorer from "./scorer/feature/retoots_in_feed_scorer";
import Scorer from "./scorer/scorer";
import ScorerCache from './scorer/scorer_cache';
import Storage, {  } from "./Storage";
import TagList from './api/tag_list';
import Toot, { earliestTootedAt, mostRecentTootedAt } from './api/objects/toot';
import TagsForFetchingToots from "./api/tags_for_fetching_toots";
import TrendingLinksScorer from './scorer/feature/trending_links_scorer';
import TrendingTagsScorer from "./scorer/feature/trending_tags_scorer";
import TrendingTootScorer from "./scorer/feature/trending_toots_scorer";
import UserData from "./api/user_data";
import VideoAttachmentScorer from "./scorer/feature/video_attachment_scorer";
import { ageInHours, ageInSeconds, ageInMinutes, ageString, sleep, timeString, toISOFormat } from './helpers/time_helpers';
import { BACKFILL_FEED, TRIGGER_FEED, lockExecution } from './helpers/log_helpers';
import { buildNewFilterSettings, updateBooleanFilterOptions } from "./filters/feed_filters";
import { config, MAX_ENDPOINT_RECORDS_TO_PULL, SECONDS_IN_MINUTE } from './config';
import { FEDIALGO, GIFV, SET_LOADING_STATUS, VIDEO_TYPES, arrowed, extractDomain } from './helpers/string_helpers';
import { FILTER_OPTION_DATA_SOURCES } from './types';
import { getMoarData, moarDataLogger } from "./api/moar_data_poller";
import { isDebugMode, isQuickMode } from './helpers/environment_helpers';
import { isWeightPresetLabel, WEIGHT_PRESETS, WeightPresetLabel, WeightPresets } from './scorer/weight_presets';
import { Logger } from './helpers/logger';
import { rechartsDataPoints } from "./helpers/stats_helper";
import {
    AlgorithmStorageKey,
    BooleanFilterName,
    CacheKey,
    MediaCategory,
    NonScoreWeightName,
    ScoreName,
    TrendingType,
    TypeFilterName,
    TagTootsCacheKey,
    isValueInStringEnum,
} from "./enums";
import {
    computeMinMax,
    makeChunks,
    makePercentileChunks,
    sortKeysByValue,
    truncateToConfiguredLength,
} from "./helpers/collection_helpers";
import {
    JUST_MUTING,
    type BooleanFilterOption,
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
    type WeightName,
    type Weights,
    type WeightInfoDict,
} from "./types";

const DEFAULT_SET_TIMELINE_IN_APP = (feed: Toot[]) => console.debug(`Default setTimelineInApp() called`);
const GET_FEED_BUSY_MSG = `called while load is still in progress. Consider using the setTimelineInApp() callback.`;
const FINALIZING_SCORES_MSG = `Finalizing scores`;
const INITIAL_LOAD_STATUS = "Retrieving initial data";
const PULLING_USER_HISTORY = `Pulling your historical data`;
const READY_TO_LOAD_MSG = "Ready to load"

const EMPTY_TRENDING_DATA: TrendingData = {
    links: [],
    tags: new TagList([], TagTootsCacheKey.TRENDING_TAG_TOOTS),
    servers: {},
    toots: []
};

/**
 * Arguments for constructing a TheAlgorithm instance.
 * @typedef {object} AlgorithmArgs
 * @property {mastodon.rest.Client} api - The Mastodon REST API client instance.
 * @property {mastodon.v1.Account} user - The Mastodon user account for which to build the feed.
 * @property {string} [locale] - Optional locale string for date formatting.
 * @property {(feed: Toot[]) => void} [setTimelineInApp] - Optional callback to set the feed in the consuming app.
 */
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
 * @property {number | null} lastLoadTimeInSeconds - Duration of the last load in seconds
 * @property {string | null} loadingStatus - String describing load activity
 * @property {Toot[]} timeline - The current filtered timeline
 * @property {TrendingData} trendingData - Trending data (links, tags, servers, toots)
 * @property {UserData} userData - User data for scoring and filtering
 * @property {Scorer[]} weightedScorers - List of all scorers that can be weighted by user
 * @property {WeightInfoDict} weightInfo - Info about all scoring weights
 */
class TheAlgorithm {
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
    lastLoadTimeInSeconds: number | null = null;  // Duration of the last load in seconds
    loadingStatus: string | null = READY_TO_LOAD_MSG;  // String describing load activity (undefined means load complete)
    trendingData: TrendingData = EMPTY_TRENDING_DATA;

    get apiErrorMsgs(): string[] { return MastoApi.instance.apiErrors.map(e => e.message) };
    // TODO: Using loadingStatus as the marker for loading state is a bit (or a lot) janky.
    get isLoading(): boolean { return !!(this.loadingStatus && this.loadingStatus != READY_TO_LOAD_MSG) };
    get timeline(): Toot[] { return [...this.feed] };
    get userData(): UserData { return MastoApi.instance.userData || new UserData() };

    // Constructor argument variables
    private api: mastodon.rest.Client;
    private user: mastodon.v1.Account;
    private setTimelineInApp: (feed: Toot[]) => void;  // Optional callback to set the feed in the app using this package
    // Other private variables
    private feed: Toot[] = [];
    private homeFeed: Toot[] = [];  // Just the toots pulled from the home timeline
    private hasProvidedAnyTootsToClient = false;  // Flag to indicate if the feed has been set in the app
    private loadStartedAt: Date | null = null;  // Timestamp of when the feed started loading
    private numTriggers = 0;
    private totalNumTimesShown = 0;  // Sum of timeline toots' numTimesShown
    // Loggers
    private logger: Logger = new Logger(`TheAlgorithm`);
    // Mutexess
    private mergeMutex = new Mutex();
    // Background tasks
    private cacheUpdater?: ReturnType<typeof setInterval>;
    private dataPoller?: ReturnType<typeof setInterval>;

    // These can score a toot without knowing about the rest of the toots in the feed
    private featureScorers = [
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

    // These scorers require the complete feed to work properly
    private feedScorers = [
        new DiversityFeedScorer(),
    ];

    weightedScorers = [
        ...this.featureScorers,
        ...this.feedScorers,
    ];

    weightInfo: WeightInfoDict = this.weightedScorers.reduce(
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
        await MastoApi.init(params.api, params.user as Account);
        const user = Account.build(params.user);
        await Storage.logAppOpen(user);

        // Construct the algorithm object, set the default weights, load feed and filters
        const algo = new TheAlgorithm({api: params.api, user: user, setTimelineInApp: params.setTimelineInApp});
        ScorerCache.addScorers(algo.featureScorers, algo.feedScorers);
        await algo.loadCachedData();
        return algo;
    }

    /**
     * Private constructor for TheAlgorithm. Use TheAlgorithm.create() to instantiate.
     * @param {AlgorithmArgs} params - Constructor params (API client, user, and optional timeline callback/locale).
     */
    private constructor(params: AlgorithmArgs) {
        this.api = params.api;
        this.user = params.user;
        this.setTimelineInApp = params.setTimelineInApp ?? DEFAULT_SET_TIMELINE_IN_APP;
    }

    /**
     * Trigger the retrieval of the user's timeline from all the sources.
     * @param {boolean} [moreOldToots] - Backfill older toots instead of getting new toots
     * @returns {Promise<void>}
     */
    async triggerFeedUpdate(moreOldToots?: boolean): Promise<void> {
        const logger = this.logger.tempLogger(TRIGGER_FEED);
        logger.log(`called, ${++this.numTriggers} triggers so far, state:`, this.statusDict());
        this.checkIfLoading();
        if (moreOldToots) return await this.triggerHomeTimelineBackFill();
        if (this.checkIfSkipping()) return;
        this.markLoadStartedAt();
        this.setLoadingStateVariables(TRIGGER_FEED);

        // Launch these asynchronously so we can start pulling toots right away
        MastoApi.instance.getUserData();
        ScorerCache.prepareScorers();

        let dataLoads: Promise<any>[] = [
            this.getHomeTimeline().then((toots) => this.homeFeed = toots),
        ];

        // Sleep to Delay the trending tag etc. toot pulls a bit because they generate a ton of API calls
        await sleep(config.api.hashtagTootRetrievalDelaySeconds * 1000);  // TODO: do we really need to do this sleeping?

        const hashtagToots = async (key: TagTootsCacheKey) => {
            const tagList = await TagsForFetchingToots.create(key);
            return await this.fetchAndMergeToots(tagList.getToots(), tagList.logger);
        };

        dataLoads = dataLoads.concat([
            this.fetchAndMergeToots(MastodonServer.fediverseTrendingToots(), new Logger(CacheKey.FEDIVERSE_TRENDING_TOOTS)),
            hashtagToots(TagTootsCacheKey.FAVOURITED_TAG_TOOTS),
            hashtagToots(TagTootsCacheKey.PARTICIPATED_TAG_TOOTS),
            hashtagToots(TagTootsCacheKey.TRENDING_TAG_TOOTS),
            // Population of instance variables - these are not required to be done before the feed is loaded
            MastodonServer.getTrendingData().then((trendingData) => this.trendingData = trendingData),
        ]);

        const allResults = await Promise.allSettled(dataLoads);
        logger.deep(`FINISHED promises, allResults:`, allResults);
        await this.finishFeedUpdate();
    }

    /**
     * Trigger the loading of additional toots, farther back on the home timeline.
     * @returns {Promise<void>}
     */
    async triggerHomeTimelineBackFill(): Promise<void> {
        this.logger.log(`${arrowed(BACKFILL_FEED)} called, state:`, this.statusDict());
        this.checkIfLoading();
        this.markLoadStartedAt();
        this.setLoadingStateVariables(BACKFILL_FEED);
        this.homeFeed = await this.getHomeTimeline(true);
        await this.finishFeedUpdate();
    }

    /**
     * Manually trigger the loading of "moar" user data (recent toots, favourites, notifications, etc).
     * Usually done by a background task on a set interval.
     * @returns {Promise<void>}
     */
    async triggerMoarData(): Promise<void> {
        this.checkIfLoading();
        this.loadingStatus = `Triggering moar data fetching...`;
        let shouldReenablePoller = false;

        if (this.dataPoller) {
            moarDataLogger.log(`Disabling current data poller...`);
            this.dataPoller && clearInterval(this.dataPoller!);   // Stop the dataPoller if it's running
            this.dataPoller = undefined;
            shouldReenablePoller  = true;
        }

        try {
            const _shouldContinue = await getMoarData();
        } catch (error) {
            MastoApi.throwSanitizedRateLimitError(error, `triggerMoarData() Error pulling user data:`);
        } finally {
            // reenable when finished
            if (shouldReenablePoller) this.enableMoarDataBackgroundPoller();
            this.loadingStatus = null;
        }
    }

    /**
     * Collect *ALL* the user's history data from the server - past toots, favourites, etc.
     * Use with caution!
     * @returns {Promise<void>}
     */
    async triggerPullAllUserData(): Promise<void> {
        const thisLogger = this.logger.tempLogger(`triggerPullAllUserData`);
        thisLogger.log(`Called, state:`, this.statusDict());
        this.checkIfLoading();
        this.markLoadStartedAt();
        this.setLoadingStateVariables(PULLING_USER_HISTORY);
        this.dataPoller && clearInterval(this.dataPoller!);   // Stop the dataPoller if it's running

        try {
            const _allResults = await Promise.allSettled([
                MastoApi.instance.getFavouritedToots(FULL_HISTORY_PARAMS),
                // TODO: there's just too many notifications to pull all of them
                MastoApi.instance.getNotifications({maxRecords: MAX_ENDPOINT_RECORDS_TO_PULL, moar: true}),
                MastoApi.instance.getRecentUserToots(FULL_HISTORY_PARAMS),
            ]);

            await this.recomputeScorers();
            thisLogger.log(`Finished!`);
        } catch (error) {
            MastoApi.throwSanitizedRateLimitError(error, thisLogger.line(`Error pulling user data:`));
        } finally {
            this.loadingStatus = null;  // TODO: should we restart the data poller?
        }
    }

    /**
     * Return an object describing the state of the world. Mostly for debugging.
     * @returns {Promise<Record<string, any>>} State object.
     */
    async getCurrentState(): Promise<Record<string, any>> {
        return {
            Algorithm: this.statusDict(),
            Api: {
                errors: this.apiErrorMsgs,
                waitTimes: MastoApi.instance.waitTimes,
            },
            Config: config,
            Filters: this.filters,
            Homeserver: await this.serverInfo(),
            Storage: await Storage.storedObjsInfo(),
            Trending: this.trendingData,
            UserData: await MastoApi.instance.getUserData(),
        };
    }

    /**
     * Return an array of objects suitable for use with Recharts.
     * @param {number} [numPercentiles=5] - Number of percentiles for stats.
     * @returns {any[]} Recharts data points.
     */
    getRechartsStatsData(numPercentiles: number = 5): any[] {
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
            this.logger.warn(`mostRecentHomeTootAt() homeFeed is empty, falling back to full feed`);
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
        this.logger.trace(`feed is ${ageInMinutes(mostRecentAt).toFixed(2)} mins old, most recent home toot: ${timeString(mostRecentAt)}`);
        return ageInSeconds(mostRecentAt);
    }

    /**
     * Pull the latest list of muted accounts from the server and use that to filter any newly muted accounts
     * out of the timeline.
     * @returns {Promise<void>}
     */
    async refreshMutedAccounts(): Promise<void> {
        const logger = this.logger.tempLogger(`refreshMutedAccounts`);
        logger.log(`called (${Object.keys(this.userData.mutedAccounts).length} current muted accounts)...`);
        // TODO: move refreshMutedAccounts() to UserData class?
        const mutedAccounts = await MastoApi.instance.getMutedAccounts({bustCache: true});
        logger.log(`Found ${mutedAccounts.length} muted accounts after refresh...`);
        this.userData.mutedAccounts = Account.buildAccountNames(mutedAccounts);
        await Toot.completeToots(this.feed, logger, JUST_MUTING);
        await this.finishFeedUpdate();
    }

    /**
     * Clear everything from browser storage except the user's identity and weightings (unless complete is true).
     * @param {boolean} [complete=false] - If true, remove user data as well.
     * @returns {Promise<void>}
     */
    async reset(complete: boolean = false): Promise<void> {
        this.logger.warn(`reset() called, clearing all storage...`);
        this.dataPoller && clearInterval(this.dataPoller!);
        this.dataPoller = undefined;
        this.cacheUpdater && clearInterval(this.cacheUpdater!);
        this.cacheUpdater = undefined;
        this.hasProvidedAnyTootsToClient = false;
        this.loadingStatus = READY_TO_LOAD_MSG;
        this.loadStartedAt = null;
        this.numTriggers = 0;
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
    }

    /**
     * Save the current timeline to the browser storage. Used to save the state of toots' numTimesShown.
     * @returns {Promise<void>}
     */
    async saveTimelineToCache(): Promise<void> {
        if (this.isLoading) return;
        const logger = this.logger.tempLogger(`saveTimelineToCache`);
        const newTotalNumTimesShown = this.feed.reduce((sum, toot) => sum + (toot.numTimesShown ?? 0), 0);
        if (this.totalNumTimesShown == newTotalNumTimesShown) return;

        try {
            const numShownToots = this.feed.filter(toot => toot.numTimesShown).length;
            const msg = `Saving ${this.feed.length} toots with ${newTotalNumTimesShown} times shown`;
            logger.debug(`${msg} on ${numShownToots} toots (previous totalNumTimesShown: ${this.totalNumTimesShown})`);
            await Storage.set(CacheKey.TIMELINE_TOOTS, this.feed);
            this.totalNumTimesShown = newTotalNumTimesShown;
        } catch (error) {
            logger.error(`Error saving toots:`, error);
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
        this.logger.log(`updateFilters() called with newFilters:`, newFilters);
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
        this.logger.log("updateUserWeights() called with weights:", userWeights);
        await Storage.setWeightings(userWeights);
        return this.scoreAndFilterFeed();
    }

    /**
     * Update user weightings to one of the preset values and rescore / resort the feed.
     * @param {WeightPresetLabel | string} presetName - The preset name.
     * @returns {Promise<Toot[]>} The filtered and rescored feed.
     */
    async updateUserWeightsToPreset(presetName: WeightPresetLabel | string): Promise<Toot[]> {
        this.logger.log("updateUserWeightsToPreset() called with presetName:", presetName);

        if (!isWeightPresetLabel(presetName)) {
            this.logger.logAndThrowError(`Invalid weight preset: "${presetName}"`);
        }

        return await this.updateUserWeights(WEIGHT_PRESETS[presetName as WeightPresetLabel]);
    }

    ///////////////////////////////
    //      Private Methods      //
    ///////////////////////////////

    // Throw an error if the feed is loading
    private checkIfLoading(): void {
        if (this.isLoading) {
            this.logger.warn(`${arrowed(TRIGGER_FEED)} Load in progress already!`, this.statusDict());
            throw new Error(`${TRIGGER_FEED} ${GET_FEED_BUSY_MSG}`);
        }
    }

    // Return true if we're in quick mode and the feed is fresh enough that we don't need to update it (for dev)
    private checkIfSkipping(): boolean {
        let feedAgeInMinutes = this.mostRecentHomeTootAgeInSeconds();
        if (feedAgeInMinutes) feedAgeInMinutes /= 60;
        const maxAgeMinutes = config.minTrendingMinutesUntilStale();

        if (isQuickMode && feedAgeInMinutes && feedAgeInMinutes < maxAgeMinutes && this.numTriggers <= 1) {
            this.logger.debug(`${arrowed(TRIGGER_FEED)} QUICK_MODE Feed is ${feedAgeInMinutes.toFixed(0)}s old, not updating`);
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
            this.logTelemetry(`Got ${newToots.length} toots for ${CacheKey.HOME_TIMELINE_TOOTS}`, startedAt, logger);
        } catch (e) {
            MastoApi.throwIfAccessTokenRevoked(logger, e, `Error fetching toots ${ageString(startedAt)}`);
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
            const msg = `First ${filteredFeed.length} toots sent to client`;
            this.logTelemetry(msg, this.loadStartedAt || new Date());
        }

        return filteredFeed;
    }

    // The "load is finished" version of setLoadingStateVariables().
    private async finishFeedUpdate(): Promise<void> {
        const logger = this.logger.tempLogger(`finishFeedUpdate()`);
        this.loadingStatus = FINALIZING_SCORES_MSG;

        // Now that all data has arrived go back over the feed and do the slow calculations of trendingLinks etc.
        logger.debug(`${this.loadingStatus}...`);
        await Toot.completeToots(this.feed, logger);
        this.feed = await Toot.removeInvalidToots(this.feed, logger);
        await updateBooleanFilterOptions(this.filters, this.feed);
        //updateHashtagCounts(this.filters, this.feed);  // TODO: this took too long (4 minutes for 3000 toots) but maybe is ok now?
        await this.scoreAndFilterFeed();

        if (this.loadStartedAt) {
            this.logTelemetry(`finished home TL load w/ ${this.feed.length} toots`, this.loadStartedAt);
            this.lastLoadTimeInSeconds = ageInSeconds(this.loadStartedAt);
        } else {
            logger.warn(`finished but loadStartedAt is null!`);
        }

        this.loadStartedAt = null;
        this.loadingStatus = null;
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
    // as well as the cache updater that saves the current state of the timeline toots' alreadyShown to storage
    private launchBackgroundPoller(): void {
        this.enableMoarDataBackgroundPoller();

        // The cache updater writes the current state of the feed to storage every few seconds
        // to capture changes to the alreadyShown state of toots.
        if (this.cacheUpdater) {
            moarDataLogger.log(`cacheUpdater already exists, not starting another one`);
            return;
        }

        this.cacheUpdater = setInterval(
            async () => await this.saveTimelineToCache(),
            config.toots.saveChangesIntervalSeconds * 1000
        );
    }

    // Load cached data from storage. This is called when the app is first opened and when reset() is called.
    private async loadCachedData(): Promise<void> {
        this.feed = await Storage.getCoerced<Toot>(CacheKey.TIMELINE_TOOTS);

        if (this.feed.length == config.toots.maxTimelineLength) {
            const numToClear = config.toots.maxTimelineLength - config.toots.truncateFullTimelineToLength;
            this.logger.warn(`Timeline cache is full (${this.feed.length}), cutting to ${config.toots.truncateFullTimelineToLength} toots`);
            this.feed = truncateToConfiguredLength(this.feed, config.toots.truncateFullTimelineToLength, this.logger);
            await Storage.set(CacheKey.TIMELINE_TOOTS, this.feed);
        }

        this.homeFeed = await Storage.getCoerced<Toot>(CacheKey.HOME_TIMELINE_TOOTS);
        this.trendingData = await Storage.getTrendingData();
        this.filters = await Storage.getFilters() ?? buildNewFilterSettings();
        await updateBooleanFilterOptions(this.filters, this.feed);
        this.setTimelineInApp(this.feed);
        this.logger.log(`<loadCachedData()> loaded ${this.feed.length} timeline toots from cache, trendingData`);
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

    // Log timing info
    private logTelemetry(msg: string, startedAt: Date, logger?: Logger): void {
        (logger || this.logger).logTelemetry(msg, startedAt, 'current state', this.statusDict());
    }

    private markLoadStartedAt(): void {
        this.loadStartedAt = new Date();
    }

    // Merge newToots into this.feed, score, and filter the feed.
    // NOTE: Don't call this directly! Use lockedMergeTootsToFeed() instead.
    private async mergeTootsToFeed(newToots: Toot[], logger: Logger): Promise<void> {
        const startedAt = new Date();
        const numTootsBefore = this.feed.length;
        this.feed = Toot.dedupeToots([...this.feed, ...newToots], logger.tempLogger('mergeTootsToFeed'));
        await updateBooleanFilterOptions(this.filters, this.feed);
        await this.scoreAndFilterFeed();
        logger.logTelemetry(`merged ${newToots.length} new toots into ${numTootsBefore} timeline toots`, startedAt);
        this.setLoadingStateVariables(logger.logPrefix);
    }

    // Recompute the scorers' computations based on user history etc. and trigger a rescore of the feed
    private async recomputeScorers(): Promise<void> {
        await MastoApi.instance.getUserData(true);  // Refresh user data
        await ScorerCache.prepareScorers(true);  // The "true" arg is the key here
        await this.scoreAndFilterFeed();
    }

    // Score the feed, sort it, save it to storage, and call filterFeed() to update the feed in the app
    // Returns the FILTERED set of toots (NOT the entire feed!)
    private async scoreAndFilterFeed(): Promise<Toot[]> {
        // await ScorerCache.prepareScorers();
        this.feed = await Scorer.scoreToots(this.feed, true);

        this.feed = truncateToConfiguredLength(
            this.feed,
            config.toots.maxTimelineLength,
            this.logger.tempLogger('scoreAndFilterFeed()')
        );

        await Storage.set(CacheKey.TIMELINE_TOOTS, this.feed);
        return this.filterFeedAndSetInApp();
    }

    // sets this.loadingStatus to a message indicating the current state of the feed
    private setLoadingStateVariables(logPrefix: string): void {
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

        this.logger.trace(`<${SET_LOADING_STATUS}) ${logPrefix}`, `setLoadingStateVariables()`, this.statusDict());
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
            isLoading: this.isLoading,
            loadingStatus: this.loadingStatus,
            minMaxScores: computeMinMax(this.feed, (toot) => toot.scoreInfo?.score),
        };
    }

    private enableMoarDataBackgroundPoller(): void {
        if (this.dataPoller) {
            moarDataLogger.log(`Data poller already exists, not starting another one`);
            return;
        }

        this.dataPoller = setInterval(
            async () => {
                const shouldContinue = await getMoarData();
                await this.recomputeScorers();  // Force scorers to recompute data, rescore the feed

                if (!shouldContinue) {
                    moarDataLogger.log(`stopping data poller...`);
                    this.dataPoller && clearInterval(this.dataPoller!);
                }
            },
            config.api.backgroundLoadIntervalMinutes * SECONDS_IN_MINUTE * 1000
        );
    }
};


export default TheAlgorithm;

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
    ObjWithCountList,
    TagList,
    Toot,
    // Enums
    BooleanFilterName,
    MediaCategory,
    NonScoreWeightName,
    ScoreName,
    TagTootsCacheKey,
    TrendingType,
    TypeFilterName,
    WeightName,
    WeightPresetLabel,
    // Helpers
    extractDomain,
    isAccessTokenRevokedError,
    isValueInStringEnum,
    makeChunks,
    makePercentileChunks, // TODO: unused in demo app (for now)
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
