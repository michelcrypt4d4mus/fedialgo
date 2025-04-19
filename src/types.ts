import { mastodon } from 'masto';

import NumericFilter, { NumericFilterArgs } from './filters/numeric_filter';
import PropertyFilter, { PropertyFilterArgs, PropertyName } from './filters/property_filter';
import Scorer from './scorer/scorer';
import Toot, { SerializableToot } from './api/objects/toot';


export enum Key {
    BLOCKED_ACCOUNTS = 'blockedAccounts',
    FILTERS = 'filters',
    FOLLOWED_ACCOUNTS = 'FollowedAccounts',
    HOME_TIMELINE = 'homeTimeline',
    LAST_OPENED = "lastOpened",
    MUTED_ACCOUNTS = 'mutedAccounts',
    OPENINGS = "openings",
    POPULAR_SERVERS = 'popularServers',
    RECENT_FAVOURITES = "recentFavourites",
    RECENT_NOTIFICATIONS = 'recentNotifications',
    RECENT_TOOTS = "recentToots",
    RECENT_USER_TOOTS = 'recentUserToots',
    SERVER_SIDE_FILTERS = 'serverFilters',
    TIMELINE = 'timeline',
    TRENDING = 'trending',
    USER = 'algouser',
    WEIGHTS = 'weights'
};

export enum WeightName {
    CHAOS = 'Chaos',
    DIVERSITY = 'Diversity',
    FAVORITED_ACCOUNTS = 'FavoritedAccounts',
    FOLLOWED_TAGS = 'FollowedTags',
    IMAGE_ATTACHMENTS = 'ImageAttachments',
    INTERACTIONS = 'Interactions',
    MENTIONS_FOLLOWED = 'MentionsFollowed',
    MOST_REPLIED_ACCOUNTS = "MostRepliedAccounts",
    MOST_RETOOTED_ACCOUNTS = 'MostRetootedAccounts',
    NUM_FAVOURITES = 'NumFavourites',
    NUM_REPLIES = 'NumReplies',
    NUM_RETOOTS = 'NumRetoots',
    RETOOTED_IN_FEED = 'RetootedInFeed',
    TRENDING_LINKS = 'TrendingLinks',
    TRENDING_TAGS = "TrendingTags",
    TRENDING_TOOTS = "TrendingToots",
    VIDEO_ATTACHMENTS = 'VideoAttachments',
    // Special weights
    TIME_DECAY = 'TimeDecay',
    TRENDING = 'Trending',
};


// Records
export type AccountLike = mastodon.v1.Account | mastodon.v1.StatusMention;
export type AccountNames = Record<mastodon.v1.Account["acct"], mastodon.v1.Account>;
export type ScorerDict = Record<WeightName, ScorerInfo>;
export type StatusList = mastodon.v1.Status[];
export type StringNumberDict = Record<string, number>;
export type Weights = Record<WeightName, number>;
export type TootURIs = Record<mastodon.v1.Status["uri"], mastodon.v1.Status | Toot>;

// Misc
export type CountKey = FilterTitle | string;
export type FeedFetcher = (api: mastodon.rest.Client) => Promise<Toot[]>;
export type FilterTitle = PropertyName | WeightName;
export type StorageKey = Key | WeightName;


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
    // API stuff
    minRecordsForFeatureScoring: number;
    maxFollowingAccountsToPull: number;
    reloadFeaturesEveryNthOpen: number;
    numServersToCheck: number;
    minServerMAU: number;
    // Trending tags
    numTootsPerTrendingTag: number;
    numDaysToCountTrendingTagData: number;
    numTrendingLinksPerServer: number;
    numTrendingTags: number;
    numTrendingTagsPerServer: number;
    numTrendingTagsToots: number;
    // Trending toots
    numTrendingTootsPerServer: number;
    // MAU and other server properties
    defaultServers: string[];
    noMauServers: string[];
};


export interface AlgorithmArgs {
    api: mastodon.rest.Client;
    user: mastodon.v1.Account;
    setFeedInApp?: (feed: Toot[]) => void;  // Optional callback to set the feed in the code using this package
};


export type FeedFilterSettingsSerialized = {
    feedFilterSectionArgs: PropertyFilterArgs[];
    numericFilterArgs: NumericFilterArgs[];
};

export interface FeedFilterSettings extends FeedFilterSettingsSerialized {
    filterSections: Record<PropertyName, PropertyFilter>;
    numericFilters: Record<WeightName, NumericFilter>;
};

export type FilterArgs = {
    title: PropertyName | WeightName;
    description?: string;
    invertSelection?: boolean;
    visible?: boolean;
};

export type ScorerInfo = {
    defaultWeight: number;
    description: string;
    minValue?: number;
    scorer?: Scorer;
};

export type TimelineData = {
    homeToots: Toot[],
    otherToots: Toot[],
    trendingLinks?: TrendingLink[],
    trendingTags?: TrendingTag[],
    trendingToots?: Toot[],
};

// Data retrieved at startup and stored in TheAlgorithm
export type UserData = {
    mutedAccounts: AccountNames,
    serverSideFilters: mastodon.v2.Filter[],
};

export type TootScore = {
    rawScore: number;             // Score before applying timeDecayMultiplier
    rawScores: Weights;
    score: number;
    timeDecayMultiplier: number;  // Multiplier that reduces the score of older posts
    weightedScores: Weights;
};

export interface TrendingLink extends mastodon.v1.TrendLink {
    numToots?: number;
    numAccounts?: number;
};

export interface TrendingTag extends mastodon.v1.Tag {
    numAccounts?: number;
    numToots?: number;
    trendingRank?: number;
};

export type TrendingTagToots = {
    tags: TrendingTag[];
    toots: Toot[];
};

export type TrendingStorage = {
    tags: TrendingTag[];
    links: TrendingLink[];
    toots: Toot[];
};

export type TrendingWithHistory = TrendingLink | TrendingTag;
export type TrendingObj = TrendingWithHistory | Toot;

// Types that are valid for browser local storage
export type StorageValue = (
    FeedFilterSettings |
    FeedFilterSettingsSerialized |
    StringNumberDict |
    SerializableToot[] |
    TootURIs |
    TrendingStorage |
    Weights |
    mastodon.v1.Account |
    mastodon.v1.Account[] |
    mastodon.v2.Filter[] |
    mastodon.v1.TrendLink[] |
    number
);


// From https://dev.to/nikosanif/create-promises-with-timeout-error-in-typescript-fmm
function promiseWithTimeout<T>(
    promise: Promise<T>,
    milliseconds: number,
    timeoutError = new Error('Promise timed out')
): Promise<T> {
    // create a promise that rejects in milliseconds
    const timeout = new Promise<never>((_, reject) => {
        setTimeout(() => {
            reject(timeoutError);
        }, milliseconds);
    });

    // returns a race between timeout and the passed promise
    return Promise.race<T>([promise, timeout]);
};
