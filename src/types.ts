import { mastodon } from 'masto';

import FeedFilterSection, { FeedFilterSectionArgs, FilterOptionName } from './objects/feed_filter_section';
import NumericFilter, { NumericFilterArgs } from './objects/numeric_filter';
import Scorer from './scorer/scorer';


export enum WeightName {
    CHAOS = 'Chaos',
    DIVERSITY = 'Diversity',
    FAVORITED_ACCOUNTS = 'FavoritedAccounts',
    FOLLOWED_TAGS = 'FollowedTags',
    IMAGE_ATTACHMENTS = 'ImageAttachments',
    INTERACTIONS = 'Interactions',
    MOST_REPLIED_ACCOUNTS = "MostRepliedAccounts",
    MOST_RETOOTED_ACCOUNTS = 'MostRetootedAccounts',
    NUM_FAVOURITES = 'NumFavourites',
    NUM_REPLIES = 'NumReplies',
    NUM_RETOOTS = 'NumRetoots',
    RETOOTED_IN_FEED = 'RetootedInFeed',
    TIME_DECAY = 'TimeDecay',
    TRENDING_TAGS = "TrendingTags",
    TRENDING_TOOTS = "TrendingToots",
    VIDEO_ATTACHMENTS = 'VideoAttachments',
};

// Records
export type AccountFeature = Record<mastodon.v1.Account["acct"], number>;
export type AccountNames = Record<mastodon.v1.Account["acct"], mastodon.v1.Account>;
export type FeedFeature = AccountFeature | StringNumberDict;
export type ScorerDict = Record<WeightName, ScorerInfo>;
export type ServerFeature = Record<mastodon.v1.Instance["uri"], number>;
export type StringNumberDict = Record<string, number>;
export type Weights = Record<WeightName, number>;
export type TootURIs = Record<mastodon.v1.Status["uri"], mastodon.v1.Status | Toot>;

export interface AlgorithmArgs {
    api: mastodon.rest.Client;
    user: mastodon.v1.Account;
    setFeedInApp?: (feed: Toot[]) => void;  // Optional callback to set the feed in the code using this package
};

// See DEFAULT_CONFIG for comments explaining these values
export type Config = {
    defaultLanguage: string;
    defaultRecordsPerPage: number;
    maxNumCachedToots: number;
    // Timeline
    enableIncrementalLoad: boolean;
    incrementalLoadDelayMS: number;
    maxTimelineHoursToFetch: number;
    maxTimelineTootsToFetch: number;
    numTootsInFirstFetch: number;
    reloadIfOlderThanMinutes: number;
    // API stuff
    minRecordsForFeatureScoring: number;
    maxFollowingAccountsToPull: number;
    reloadFeaturesEveryNthOpen: number;
    numServersToCheck: number;
    minServerMAU: number;
    // Trending tags
    numTootsPerTrendingTag: number;
    numDaysToCountTrendingTagData: number;
    numTrendingTags: number;
    numTrendingTagsPerServer: number;
    numTrendingTagsToots: number;
    // Trending toots
    numTrendingTootsPerServer: number;
    // Tag filters
    minTootsToAppearInFilter: number;
    // MAU and other server properties
    noMauServers: string[];
};

export type FeedFetcher = (api: mastodon.rest.Client) => Promise<Toot[]>;

export type FeedFilterSettingsSerialized = {
    feedFilterSectionArgs: FeedFilterSectionArgs[];
    numericFilterArgs: NumericFilterArgs[];
};

export interface FeedFilterSettings extends FeedFilterSettingsSerialized {
    filterSections: Record<FilterOptionName, FeedFilterSection>;
    numericFilters: Record<WeightName, NumericFilter>;
};

export type ScorerInfo = {
    defaultWeight: number;
    description: string;
    minValue?: number;
    scorer?: Scorer;
};

export interface Toot extends mastodon.v1.Status {
    followedTags?: mastodon.v1.Tag[];  // Array of tags that the user follows that exist in this toot
    isFollowed?: boolean;              // Whether the user follows the account that posted this toot
    reblog?: Toot,                     // The toot that was retooted (if any)
    reblogBy?: mastodon.v1.Account;    // The account that retooted this toot (if any)
    scoreInfo?: TootScore;             // Scoring info for weighting/sorting this toot
    trendingRank?: number;             // Most trending on a server gets a 10, next is a 9, etc.
    trendingTags?: TrendingTag[];      // Tags that are trending in this toot
};

export type TootScore = {
    rawScore: number;             // Score before applying timeDecayMultiplier
    rawScores: Weights;
    score: number;
    timeDecayMultiplier: number;  // Multiplier that reduces the score of older posts
    weightedScores: Weights;
};

export interface TrendingTag extends mastodon.v1.Tag {
    numAccounts?: number;
    numToots?: number;
    trendingRank?: number;
};

export type StorageValue = FeedFeature | FeedFilterSettings | FeedFilterSettingsSerialized | ServerFeature |
    TootURIs |Toot[] | Weights | mastodon.v1.Account | mastodon.v1.Account[] | number;
