import 'reflect-metadata';
import { mastodon } from "masto";
import Account from './api/objects/account';
import BooleanFilter from "./filters/boolean_filter";
import { isAccessTokenRevokedError } from "./api/api";
import NumericFilter from './filters/numeric_filter';
import ObjWithCountList, { ObjList } from "./api/obj_with_counts_list";
import TagList from './api/tag_list';
import Toot from './api/objects/toot';
import UserData from "./api/user_data";
import { timeString } from './helpers/time_helpers';
import { FEDIALGO, GIFV, VIDEO_TYPES, extractDomain } from './helpers/string_helpers';
import { FILTER_OPTION_DATA_SOURCES } from './types';
import { WeightPresetLabel, WeightPresets } from './scorer/weight_presets';
import { Logger } from './helpers/logger';
import { BooleanFilterName, MediaCategory, NonScoreWeightName, ScoreName, TrendingType, TypeFilterName, TagTootsCacheKey, isValueInStringEnum } from "./enums";
import { makeChunks, makePercentileChunks, sortKeysByValue } from "./helpers/collection_helpers";
import { type BooleanFilterOption, type FeedFilterSettings, type FilterOptionDataSource, type KeysOfValueType, type MastodonInstance, type MastodonTag, type MinMaxAvgScore, type ScoreStats, type StringNumberDict, type TagWithUsageCounts, type TrendingData, type TrendingLink, type TrendingObj, type TrendingWithHistory, type WeightInfoDict, type WeightName, type Weights } from "./types";
declare const GET_FEED_BUSY_MSG = "Load in progress (consider using the setTimelineInApp() callback instead)";
declare const READY_TO_LOAD_MSG = "Ready to load";
interface AlgorithmArgs {
    api: mastodon.rest.Client;
    user: mastodon.v1.Account;
    locale?: string;
    setTimelineInApp?: (feed: Toot[]) => void;
}
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
declare class TheAlgorithm {
    /**
     * True if FEDIALGO_DEBUG environment var was set at compile time.
     * @returns {boolean}
     */
    static get isDebugMode(): boolean;
    /**
     * Dictionary of preset weight configurations for scoring.
     * @returns {WeightPresets}
     */
    static get weightPresets(): WeightPresets;
    filters: FeedFilterSettings;
    lastLoadTimeInSeconds?: number;
    loadingStatus: string | null;
    trendingData: TrendingData;
    get apiErrorMsgs(): string[];
    get isLoading(): boolean;
    get timeline(): Toot[];
    get userData(): UserData;
    private api;
    private user;
    private setTimelineInApp;
    private feed;
    private homeFeed;
    private hasProvidedAnyTootsToClient;
    private loadStartedAt;
    private totalNumTimesShown;
    private logger;
    private mergeMutex;
    private numTriggers;
    private cacheUpdater?;
    private dataPoller?;
    private featureScorers;
    private feedScorers;
    private weightedScorers;
    weightsInfo: WeightInfoDict;
    /**
     * Publicly callable constructor that instantiates the class and loads the feed from storage.
     * @param {AlgorithmArgs} params - The parameters for algorithm creation.
     * @param {mastodon.rest.Client} params.api - The Mastodon REST API client instance.
     * @param {mastodon.v1.Account} params.user - The Mastodon user account for which to build the feed.
     * @param {string} [params.locale] - Optional locale string for date formatting.
     * @param {(feed: Toot[]) => void} [params.setTimelineInApp] - Optional callback to set the feed in the consuming app.
     * @returns {Promise<TheAlgorithm>} TheAlgorithm instance.
     */
    static create(params: AlgorithmArgs): Promise<TheAlgorithm>;
    /**
     * Private constructor for TheAlgorithm. Use TheAlgorithm.create() to instantiate.
     * @param {AlgorithmArgs} params - Constructor params (API client, user, and optional timeline callback/locale).
     */
    private constructor();
    /**
     * Trigger the retrieval of the user's timeline from all the sources.
     * @param {boolean} [moreOldToots] - Backfill older toots instead of getting new toots
     * @returns {Promise<void>}
     */
    triggerFeedUpdate(moreOldToots?: boolean): Promise<void>;
    /**
     * Trigger the loading of additional toots, farther back on the home timeline.
     * @returns {Promise<void>}
     */
    triggerHomeTimelineBackFill(): Promise<void>;
    /**
     * Manually trigger the loading of "moar" user data (recent toots, favourites, notifications, etc).
     * Usually done by a background task on a set interval.
     * @returns {Promise<void>}
     */
    triggerMoarData(): Promise<void>;
    /**
     * Collect *ALL* the user's history data from the server - past toots, favourites, etc.
     * Use with caution!
     * @returns {Promise<void>}
     */
    triggerPullAllUserData(): Promise<void>;
    /**
     * Return an object describing the state of the world. Mostly for debugging.
     * @returns {Promise<Record<string, any>>} State object.
     */
    getCurrentState(): Promise<Record<string, any>>;
    /**
     * Build array of objects suitable for charting timeline scoring data by quintile/decile/etc. with Recharts.
     * @param {number} numPercentiles - Number of percentiles for stats.
     * @returns {object[]} Recharts data points.
     */
    getRechartsStatsData(numPercentiles: number): object[];
    /**
     * Return the user's current weightings for each score category.
     * @returns {Promise<Weights>} The user's weights.
     */
    getUserWeights(): Promise<Weights>;
    /**
     * Return the timestamp of the most recent toot from followed accounts + hashtags ONLY.
     * @returns {Date | null} The most recent toot date or null.
     */
    mostRecentHomeTootAt(): Date | null;
    /**
     * Return the number of seconds since the most recent home timeline toot.
     * @returns {number | null} Age in seconds or null.
     */
    mostRecentHomeTootAgeInSeconds(): number | null;
    /**
     * Pull the latest list of muted accounts from the server and use that to filter any newly muted accounts
     * out of the timeline.
     * @returns {Promise<void>}
     */
    refreshMutedAccounts(): Promise<void>;
    /**
     * Clear everything from browser storage except the user's identity and weightings (unless complete is true).
     * @param {boolean} [complete=false] - If true, remove user data as well.
     * @returns {Promise<void>}
     */
    reset(complete?: boolean): Promise<void>;
    /**
     * Save the current timeline to the browser storage. Used to save the state of toots' numTimesShown.
     * @returns {Promise<void>}
     */
    saveTimelineToCache(): Promise<void>;
    /**
     * Return info about the Fedialgo user's home mastodon instance.
     * @returns {Promise<mastodon.v2.Instance>} Instance info.
     */
    serverInfo(): Promise<mastodon.v2.Instance>;
    /**
     * Get the URL for a tag on the user's home instance (aka "server").
     * @param {string | MastodonTag} tag - The tag or tag object.
     * @returns {string} The tag URL.
     */
    tagUrl(tag: string | MastodonTag): string;
    /**
     * Update the feed filters and return the newly filtered feed.
     * @param {FeedFilterSettings} newFilters - The new filter settings.
     * @returns {Toot[]} The filtered feed.
     */
    updateFilters(newFilters: FeedFilterSettings): Toot[];
    /**
     * Update user weightings and rescore / resort the feed.
     * @param {Weights} userWeights - The new user weights.
     * @returns {Promise<Toot[]>} The filtered and rescored feed.
     */
    updateUserWeights(userWeights: Weights): Promise<Toot[]>;
    /**
     * Update user weightings to one of the preset values and rescore / resort the feed.
     * @param {WeightPresetLabel | string} presetName - The preset name.
     * @returns {Promise<Toot[]>} The filtered and rescored feed.
     */
    updateUserWeightsToPreset(presetName: WeightPresetLabel | string): Promise<Toot[]>;
    private checkIfLoading;
    private checkIfSkipping;
    private fetchAndMergeToots;
    private filterFeedAndSetInApp;
    private finishFeedUpdate;
    private getHomeTimeline;
    private launchBackgroundPoller;
    private loadCachedData;
    private lockedMergeToFeed;
    private logTelemetry;
    private markLoadStartedAt;
    private mergeTootsToFeed;
    private recomputeScorers;
    private scoreAndFilterFeed;
    private setLoadingStateVariables;
    private statusDict;
    private enableMoarDataBackgroundPoller;
}
export default TheAlgorithm;
export { FILTER_OPTION_DATA_SOURCES, FEDIALGO, GET_FEED_BUSY_MSG, GIFV, READY_TO_LOAD_MSG, VIDEO_TYPES, Account, BooleanFilter, Logger, NumericFilter, ObjWithCountList, TagList, Toot, BooleanFilterName, MediaCategory, NonScoreWeightName, ScoreName, TagTootsCacheKey, TrendingType, TypeFilterName, WeightName, extractDomain, isAccessTokenRevokedError, isValueInStringEnum, makeChunks, makePercentileChunks, // TODO: unused in demo app (for now)
sortKeysByValue, timeString, type BooleanFilterOption, type FeedFilterSettings, type FilterOptionDataSource, type KeysOfValueType, type MastodonInstance, type MinMaxAvgScore, type ObjList, type ScoreStats, type StringNumberDict, type TagWithUsageCounts, type TrendingData, type TrendingLink, type TrendingObj, type TrendingWithHistory, type Weights, };
