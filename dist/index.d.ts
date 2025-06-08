import 'reflect-metadata';
import { mastodon } from "masto";
import Account from './api/objects/account';
import AlreadyShownScorer from './scorer/feature/already_shown_scorer';
import AuthorFollowersScorer from './scorer/feature/author_followers_scorer';
import BooleanFilter from "./filters/boolean_filter";
import ChaosScorer from "./scorer/feature/chaos_scorer";
import DiversityFeedScorer from "./scorer/feed/diversity_feed_scorer";
import FavouritedTagsScorer from './scorer/feature/favourited_tags_scorer';
import FollowedAccountsScorer from './scorer/feature/followed_accounts_scorer';
import FollowedTagsScorer from "./scorer/feature/followed_tags_scorer";
import FollowersScorer from './scorer/feature/followers_scorer';
import HashtagParticipationScorer from "./scorer/feature/hashtag_participation_scorer";
import ImageAttachmentScorer from "./scorer/feature/image_attachment_scorer";
import InteractionsScorer from "./scorer/feature/interactions_scorer";
import { isAccessTokenRevokedError } from "./api/api";
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
import TagList from './api/tag_list';
import Toot from './api/objects/toot';
import TrendingLinksScorer from './scorer/feature/trending_links_scorer';
import TrendingTagsScorer from "./scorer/feature/trending_tags_scorer";
import TrendingTootScorer from "./scorer/feature/trending_toots_scorer";
import UserData from "./api/user_data";
import VideoAttachmentScorer from "./scorer/feature/video_attachment_scorer";
import { timeString } from './helpers/time_helpers';
import { FEDIALGO, GIFV, VIDEO_TYPES, extractDomain } from './helpers/string_helpers';
import { FILTER_OPTION_DATA_SOURCES } from './types';
import { WeightPresetLabel, WeightPresets } from './scorer/weight_presets';
import { Logger } from './helpers/logger';
import { BooleanFilterName, MediaCategory, NonScoreWeightName, ScoreName, TrendingType, TypeFilterName, TagTootsCacheKey } from "./enums";
import { isValueInStringEnum, makeChunks, makePercentileChunks, sortKeysByValue } from "./helpers/collection_helpers";
import { type BooleanFilterOption, type FeedFilterSettings, type FilterOptionDataSource, type KeysOfValueType, type MastodonInstance, type MastodonTag, type MinMaxAvgScore, type ScoreStats, type StringNumberDict, type TagWithUsageCounts, type TrendingData, type TrendingLink, type TrendingObj, type TrendingWithHistory, type WeightName, type Weights, type WeightInfoDict } from "./types";
declare const GET_FEED_BUSY_MSG = "called while load is still in progress. Consider using the setTimelineInApp() callback.";
declare const READY_TO_LOAD_MSG = "Ready to load";
interface AlgorithmArgs {
    api: mastodon.rest.Client;
    user: mastodon.v1.Account;
    locale?: string;
    setTimelineInApp?: (feed: Toot[]) => void;
}
declare class TheAlgorithm {
    static isDebugMode: boolean;
    filters: FeedFilterSettings;
    lastLoadTimeInSeconds: number | null;
    loadingStatus: string | null;
    trendingData: TrendingData;
    weightPresets: WeightPresets;
    get userData(): UserData;
    private api;
    private user;
    private setTimelineInApp;
    private feed;
    private homeFeed;
    private hasProvidedAnyTootsToClient;
    private loadStartedAt;
    private numTriggers;
    private totalNumTimesShown;
    private logger;
    private mergeMutex;
    private cacheUpdater?;
    private dataPoller?;
    private featureScorers;
    private feedScorers;
    weightedScorers: (AlreadyShownScorer | AuthorFollowersScorer | ChaosScorer | DiversityFeedScorer | FavouritedTagsScorer | FollowedAccountsScorer | FollowedTagsScorer | FollowersScorer | HashtagParticipationScorer | ImageAttachmentScorer | InteractionsScorer | MentionsFollowedScorer | MostFavouritedAccountsScorer | MostRepliedAccountsScorer | MostRetootedAccountsScorer | NumFavouritesScorer | NumRepliesScorer | NumRetootsScorer | RetootsInFeedScorer | TrendingLinksScorer | TrendingTagsScorer | TrendingTootScorer | VideoAttachmentScorer)[];
    weightInfo: WeightInfoDict;
    /**
     * Publicly callable constructor that instantiates the class and loads the feed from storage.
     * @param {AlgorithmArgs} params - The parameters for algorithm creation.
     * @returns {Promise<TheAlgorithm>} TheAlgorithm instance.
     */
    static create(params: AlgorithmArgs): Promise<TheAlgorithm>;
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
     * Return a list of API errors encountered during this session (if any).
     * @returns {string[]} Array of error messages.
     */
    getApiErrorMsgs(): string[];
    /**
     * Return an object describing the state of the world. Mostly for debugging.
     * @returns {Promise<Record<string, any>>} State object.
     */
    getCurrentState(): Promise<Record<string, any>>;
    /**
     * Return an array of objects suitable for use with Recharts.
     * @param {number} [numPercentiles=5] - Number of percentiles for stats.
     * @returns {any[]} Recharts data points.
     */
    getRechartsStatsData(numPercentiles?: number): any[];
    /**
     * Return the current filtered timeline feed in weight order.
     * @returns {Toot[]} The filtered timeline feed.
     */
    getTimeline(): Toot[];
    /**
     * Return the user's current weightings for each score category.
     * @returns {Promise<Weights>} The user's weights.
     */
    getUserWeights(): Promise<Weights>;
    /**
     * Return true if the algorithm is currently loading data.
     * TODO: Using loadingStatus as the marker for loading state is a bit (or a lot) janky.
     * @returns {boolean} Loading state.
     */
    isLoading(): boolean;
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
     * Get the URL for a tag.
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
export { type BooleanFilterOption, type FeedFilterSettings, type FilterOptionDataSource, type KeysOfValueType, type MastodonInstance, type MinMaxAvgScore, type ObjList, type ScoreStats, type StringNumberDict, type TagWithUsageCounts, type TrendingData, type TrendingLink, type TrendingObj, type TrendingWithHistory, type Weights, FILTER_OPTION_DATA_SOURCES, FEDIALGO, GET_FEED_BUSY_MSG, GIFV, READY_TO_LOAD_MSG, VIDEO_TYPES, Account, BooleanFilter, Logger, NumericFilter, ObjWithCountList, TagList, Toot, BooleanFilterName, MediaCategory, NonScoreWeightName, ScoreName, TagTootsCacheKey, TrendingType, TypeFilterName, WeightName, WeightPresetLabel, extractDomain, isAccessTokenRevokedError, isValueInStringEnum, makeChunks, makePercentileChunks, // TODO: unused in demo app (for now)
sortKeysByValue, timeString, };
