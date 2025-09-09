import 'reflect-metadata';
import { mastodon } from "masto";
import Account from './api/objects/account';
import BooleanFilter from "./filters/boolean_filter";
import NumericFilter from './filters/numeric_filter';
import TagList from './api/tag_list';
import Toot from './api/objects/toot';
import UserData from "./api/user_data";
import { AgeIn, sleep, timeString } from './helpers/time_helpers';
import { DEFAULT_FONT_SIZE, FEDIALGO, GIFV, VIDEO_TYPES, extractDomain, optionalSuffix } from './helpers/string_helpers';
import { isAccessTokenRevokedError } from './api/errors';
import { Logger } from './helpers/logger';
import { WeightPresetLabel, type WeightPresets } from './scorer/weight_presets';
import { type ObjList } from "./api/counted_list";
import { BooleanFilterName, MediaCategory, NonScoreWeightName, ScoreName, TagTootsCategory, TrendingType, TypeFilterName, isValueInStringEnum } from "./enums";
import { makeChunks, makePercentileChunks, sortKeysByValue } from "./helpers/collection_helpers";
import { FILTER_OPTION_DATA_SOURCES, type BooleanFilterOption, type FeedFilterSettings, type FilterOptionDataSource, type KeysOfValueType, type MastodonInstance, type Hashtag, type MinMaxAvgScore, type ScoreStats, type StringNumberDict, type TagWithUsageCounts, type TrendingData, type TrendingLink, type TrendingObj, type TrendingWithHistory, type WeightInfoDict, type WeightName, type Weights } from "./types";
interface AlgorithmArgs {
    api: mastodon.rest.Client;
    user: mastodon.v1.Account;
    locale?: string;
    setTimelineInApp?: (feed: Toot[]) => void;
}
/**
 * Main class for scoring, sorting, and managing a Mastodon feed made of {@linkcode Toot} objects.
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
    filters: FeedFilterSettings;
    lastLoadTimeInSeconds?: number;
    loadingStatus: string | null;
    trendingData: TrendingData;
    get apiErrorMsgs(): string[];
    get isLoading(): boolean;
    get timeline(): Toot[];
    get userData(): UserData;
    private setTimelineInApp;
    private feed;
    private homeFeed;
    private hasProvidedAnyTootsToClient;
    private loadStartedAt;
    private totalNumTimesShown;
    private loadingMutex;
    private mergeMutex;
    private numUnscannedToots;
    private numTriggers;
    private _releaseLoadingMutex?;
    private cacheUpdater?;
    private userDataPoller;
    private feedScorers;
    private tootScorers;
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
     * Private constructor for TheAlgorithm. Use {@linkcode TheAlgorithm.create} to instantiate.
     * @param {AlgorithmArgs} params - Constructor params (API client, user, and optional timeline callback/locale).
     */
    private constructor();
    /**
     * Trigger the retrieval of the user's timeline from all the sources.
     * @returns {Promise<void>}
     */
    triggerFeedUpdate(): Promise<void>;
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
    getCurrentState(): Promise<Record<string, unknown>>;
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
     * True if FediAlgo user is on a GoToSocial instance instead of plain vanilla Mastodon.
     * @returns {boolean}
     */
    isGoToSocialUser(): Promise<boolean>;
    /**
     * Update the local trendingData property. // TODO: this shouldn't be necessary but there's weirdness on initial load
     * @returns {Promise<TrendingData>}
     */
    refreshTrendingData(): Promise<TrendingData>;
    /**
     * Return info about the Fedialgo user's home mastodon instance.
     * @returns {Promise<mastodon.v2.Instance>} Instance info.
     */
    serverInfo(): Promise<mastodon.v2.Instance>;
    /**
     * Get the URL for a tag on the user's home instance (aka "server").
     * @param {string | Hashtag} tag - The tag or tag object.
     * @returns {string} The tag URL.
     */
    tagUrl(tag: string | Hashtag): string;
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
    /**
     * Merge a new batch of toots into the feed. Mutates this.feed and returns whatever
     * 'newToots' are retrieved by 'tootFetcher()' argument.
     * @private
     * @param {Promise<Toot[]>} tootFetcher - Promise that resolves to an array of Toots.
     * @param {Logger} logger Logger to use.
     * @returns {Promise<Toot[]>} The new toots that were fetched and merged.
     */
    private fetchAndMergeToots;
    /**
     * Filter the feed based on the user's settings. Has the side effect of calling the setTimelineInApp()
     * callback (if it exists) to send the client using this library the filtered subset of Toots
     * (this.feed will always maintain the master unfiltered set of Toots).
     * @private
     * @returns {Toot[]} The filtered feed.
     */
    private filterFeedAndSetInApp;
    /**
     * Do some final cleanup and scoring operations on the feed.
     * @private
     * @returns {Promise<void>}
     */
    private finishFeedUpdate;
    /**
     * Simple wrapper for triggering fetchHomeFeed().
     * @private
     * @returns {Promise<Toot[]>}
     */
    private getHomeTimeline;
    /**
     * Kick off the MOAR data poller to collect more user history data if it doesn't already exist
     * as well as the cache updater that saves the current state of the timeline toots' alreadyShown
     * to storage.
     * @private
     */
    private launchBackgroundPollers;
    /**
     * Load cached data from Storage. Called when the app is first opened and when reset() is invoked.
     * @private
     * @returns {Promise<void>}
     */
    private loadCachedData;
    /**
     * Apparently if the mutex lock is inside mergeTootsToFeed() then the state of this.feed is not consistent
     * which can result in toots getting lost as threads try to merge newToots into different this.feed states.
     * Wrapping the entire function in a mutex seems to fix this (though i'm not sure why).
     * @private
     * @param {Toot[]} newToots - New toots to merge into this.feed
     * @param {Logger} logger - Logger to use
     * @returns {Promise<void>}
     */
    private lockedMergeToFeed;
    /**
     * Merge newToots into this.feed, score, and filter the feed.
     * NOTE: Don't call this directly! Use lockedMergeTootsToFeed() instead.
     * @private
     * @param {Toot[]} newToots - New toots to merge into this.feed
     * @param {Logger} inLogger - Logger to use
     * @returns {Promise<void>}
     */
    private mergeTootsToFeed;
    /**
     * Recompute the scorers' computations based on user history etc. and trigger a rescore of the feed.
     * @private
     * @returns {Promise<void>}
     */
    private recomputeScores;
    /**
     * Release the loading mutex and reset the loading state variables.
     * @private
     * @param {LoadAction} logPrefix - Action for logging context.
     * @returns {void}
     */
    private releaseLoadingMutex;
    /**
     * Score the feed, sort it, save it to storage, and call filterFeed() to update the feed in the app.
     * @private
     * @returns {Promise<Toot[]>} The filtered set of Toots (NOT the entire feed).
     */
    private scoreAndFilterFeed;
    /**
     * Return true if we're in QUICK_MODE and the feed is fresh enough that we don't
     * need to retrieve any new data. Useful for testing UI changes without waiting
     * for the full feed load every time.
     * @private
     * @returns {boolean} True if we should skip the feed update.
     */
    private shouldSkip;
    /**
     * Lock the mutex and set the loadStartedAt timestamp.
     * @private
     * @param {LoadAction} logPrefix - Action for logging context.
     * @returns {Promise<void>}
     * @throws {Error} If a load is already in progress.
     */
    private startAction;
    /**
     * Returns info about the state of this TheAlgorithm instance.
     * @private
     * @returns {Record<string, unknown>} Status dictionary.
     */
    private statusDict;
    /** True if FEDIALGO_DEBUG environment var was set at run time. */
    static get isDebugMode(): boolean;
    /** True if FEDIALGO_DEEP_DEBUG environment var was set at run time. */
    static get isDeepDebug(): boolean;
    /** True if LOAD_TEST environment var was set at run time. */
    static get isLoadTest(): boolean;
    /** True if QUICK_MODE environment var was set at run time. */
    static get isQuickMode(): boolean;
    /**
     * Dictionary of preset weight configurations that can be selected from to set weights.
     * @returns {WeightPresets}
     */
    static get weightPresets(): WeightPresets;
}
declare const GET_FEED_BUSY_MSG: string;
declare const READY_TO_LOAD_MSG: string;
export { DEFAULT_FONT_SIZE, FILTER_OPTION_DATA_SOURCES, FEDIALGO, GET_FEED_BUSY_MSG, GIFV, READY_TO_LOAD_MSG, VIDEO_TYPES, Account, BooleanFilter, Logger, NumericFilter, TagList, Toot, BooleanFilterName, MediaCategory, NonScoreWeightName, ScoreName, TagTootsCategory, TrendingType, TypeFilterName, WeightName, AgeIn, extractDomain, isAccessTokenRevokedError, isValueInStringEnum, makeChunks, makePercentileChunks, // TODO: unused in demo app (for now)
optionalSuffix, sleep, sortKeysByValue, timeString, type BooleanFilterOption, type FeedFilterSettings, type FilterOptionDataSource, type KeysOfValueType, type MastodonInstance, type MinMaxAvgScore, type ObjList, type ScoreStats, type StringNumberDict, type TagWithUsageCounts, type TrendingData, type TrendingLink, type TrendingObj, type TrendingWithHistory, type Weights, };
