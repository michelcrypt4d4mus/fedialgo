/*
 * Typescript type definitions.
 */
import { mastodon } from 'masto';

import Account from './api/objects/account';
import NumericFilter, { NumericFilterArgs } from './filters/numeric_filter';
import PropertyFilter, { PropertyFilterArgs, PropertyName } from './filters/property_filter';
import Scorer from './scorer/scorer';
import Toot, { SerializableToot } from './api/objects/toot';


// Names of the user adjustable score weightings
export enum WeightName {
    CHAOS = 'Chaos',
    DIVERSITY = 'Diversity',
    FAVOURITED_ACCOUNTS = 'FavouritedAccounts',
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

// Keys that are valid for local browser storage.
export enum StorageKey {
    BLOCKED_ACCOUNTS = 'BlockedAccounts',
    FAVOURITED_ACCOUNTS = WeightName.FAVOURITED_ACCOUNTS,
    FEDIVERSE_TRENDING_TAGS = 'FediverseTrendingTags',
    FEDIVERSE_TRENDING_LINKS = 'FediverseTrendingLinks',
    FEDIVERSE_TRENDING_TOOTS = 'FediverseTrendingToots',
    FILTERS = 'Filters',
    FOLLOWED_ACCOUNTS = 'FollowedAccounts',
    FOLLOWED_TAGS = WeightName.FOLLOWED_TAGS,
    HOME_TIMELINE = 'HomeTimeline',
    LAST_OPENED = "LastOpened",
    MUTED_ACCOUNTS = 'MutedAccounts',
    OPENINGS = "Openings",
    POPULAR_SERVERS = 'PopularServers',
    RECENT_NOTIFICATIONS = 'RecentNotifications',
    RECENT_USER_TOOTS = 'RecentUserToots',
    SERVER_SIDE_FILTERS = 'ServerFilters',
    TIMELINE = 'Timeline',
    TRENDING_TAG_TOOTS = 'TrendingTagToots',
    USER = 'FedialgoUser',
    WEIGHTS = 'Weights',
};

// Self explanatory
export enum MediaCategory {
    AUDIO = "audio",
    IMAGE = "image",
    VIDEO = "video",
};


// Records
export type AccountLike = Account | mastodon.v1.Account | mastodon.v1.StatusMention;  // TODO: unused
export type AccountNames = Record<mastodon.v1.Account["acct"], Account>;
export type MastodonServersInfo = Record<string, MastodonServerInfo>;
export type NumericFilters = Record<WeightName, NumericFilter>;
export type PropertyFilters = Record<PropertyName, PropertyFilter>;
export type ScorerDict = Record<WeightName, ScorerInfo>;
export type StatusList = TootLike[];
export type StringNumberDict = Record<string, number>;
export type TootLike = mastodon.v1.Status | Toot;
export type Weights = Record<WeightName, number>;

// Misc
export type CountKey = FilterTitle | string;
export type FeedFetcher = (api: mastodon.rest.Client) => Promise<Toot[]>;
export type FilterTitle = PropertyName | WeightName;

export interface FeedFilterSettings extends FeedFilterSettingsSerialized {
    filterSections: PropertyFilters;
    numericFilters: NumericFilters;
};

// To serialize TootFilters to browser storage we store the arguments required to reconstruct them
export type FeedFilterSettingsSerialized = {
    feedFilterSectionArgs: PropertyFilterArgs[];
    numericFilterArgs: NumericFilterArgs[];
};

export type FilterArgs = {
    title: FilterTitle;
    description?: string;
    invertSelection?: boolean;
    visible?: boolean;
};

// Holds basic info about a given mastodon server
export type MastodonServerInfo = {
    domain: string;
    followedPctOfMAU: number;
    serverMAU: number;
};

export type ScorerInfo = {
    description: string;
    minValue?: number;
    scorer?: Scorer;
};

// Types that are valid for browser local storage
export type StorableObj = (
    FeedFilterSettingsSerialized |
    MastodonServersInfo |
    SerializableToot[] |
    StringNumberDict |
    TrendingLink[] |
    TrendingTag[] |
    Weights |
    mastodon.v1.Account |
    mastodon.v1.Account[] |
    mastodon.v2.Filter[] |
    mastodon.v1.Tag[] |
    number
);

export type StorableWithTimestamp = {
    updatedAt: string;
    value: StorableObj;
}

export type TimelineData = {
    homeToots: Toot[],
    otherToots: Toot[],
    trendingToots?: Toot[],
};

export type TootScore = {
    rawScore: number;             // Raw score without time decay etc. applied
    rawScores: Weights;
    score: number;                // Actual final score
    timeDecayMultiplier: number;  // Multiplier that reduces the score of older posts
    weightedScore: number;        // Score before applying timeDecayMultiplier
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

export interface TrendingStorage {
    links: TrendingLink[];
    toots: Toot[];
    tags: TrendingTag[];
};

export type TrendingWithHistory = TrendingLink | TrendingTag;
export type TrendingObj = TrendingWithHistory | Toot;

// Data retrieved at startup and stored in TheAlgorithm
export type UserData = {
    followedAccounts: AccountNames,
    followedTags: StringNumberDict,
    mutedAccounts: AccountNames,
    serverSideFilters: mastodon.v2.Filter[],
};


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
