/*
 * Typescript type definitions.
 */
import { mastodon } from 'masto';
import { Mutex } from 'async-mutex';

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
    FAVOURITED_TAGS = 'FavouritedTags',
    FOLLOWED_TAGS = 'FollowedTags',
    IMAGE_ATTACHMENTS = 'ImageAttachments',
    INTERACTIONS = 'Interactions',
    MENTIONS_FOLLOWED = 'MentionsFollowed',
    MOST_REPLIED_ACCOUNTS = "MostRepliedAccounts",
    MOST_RETOOTED_ACCOUNTS = 'MostRetootedAccounts',
    NUM_FAVOURITES = 'NumFavourites',
    NUM_REPLIES = 'NumReplies',
    NUM_RETOOTS = 'NumRetoots',
    PARTICIPATED_TAGS = 'ParticipatedTags',
    RETOOTED_IN_FEED = 'RetootedInFeed',
    TRENDING_LINKS = 'TrendingLinks',
    TRENDING_TAGS = "TrendingTags",
    TRENDING_TOOTS = "TrendingToots",
    VIDEO_ATTACHMENTS = 'VideoAttachments',
    // Non score weights
    OUTLIER_DAMPENER = 'OutlierDampener',
    TIME_DECAY = 'TimeDecay',
    TRENDING = 'Trending',
};

// Order matters for the demo app
export const NON_SCORE_WEIGHTS = [
    WeightName.TIME_DECAY,
    WeightName.TRENDING,
    WeightName.OUTLIER_DAMPENER,
];

export const TRENDING_WEIGHTS = [
    WeightName.TRENDING_LINKS,
    WeightName.TRENDING_TAGS,
    WeightName.TRENDING_TOOTS,
];

// Keys that are valid for local browser storage.
export enum StorageKey {
    APP_OPENS = "AppOpens",
    BLOCKED_ACCOUNTS = 'BlockedAccounts',
    FAVOURITED_TOOTS = 'FavouritedToots',
    FEDIVERSE_POPULAR_SERVERS = 'FediversePopularServers',
    FEDIVERSE_TRENDING_TAGS = 'FediverseTrendingTags',
    FEDIVERSE_TRENDING_LINKS = 'FediverseTrendingLinks',
    FEDIVERSE_TRENDING_TOOTS = 'FediverseTrendingToots',
    FILTERS = 'Filters',
    FOLLOWED_ACCOUNTS = 'FollowedAccounts',
    FOLLOWED_TAGS = WeightName.FOLLOWED_TAGS,
    HASHTAG_TOOTS = 'HashtagToots',  // TODO: there's nothing actually stored here but it's a flag for Toot serialization
    HOME_TIMELINE = 'HomeTimeline',  // Just toots that are in the home timeline (followed accounts + tags)
    MUTED_ACCOUNTS = 'MutedAccounts',
    PARTICIPATED_TAG_TOOTS = 'ParticipatedHashtagToots',
    RECENT_NOTIFICATIONS = 'RecentNotifications',
    RECENT_USER_TOOTS = 'RecentUserToots',
    SERVER_SIDE_FILTERS = 'ServerFilters',
    TIMELINE = 'Timeline',  // The entire time line (home timeline + trending toots etc.)
    TRENDING_TAG_TOOTS = 'TrendingTagToots',
    USER = 'FedialgoUser',
    WEIGHTS = 'Weights',
};

export const FEDIVERSE_KEYS = [
    StorageKey.FEDIVERSE_POPULAR_SERVERS,
    StorageKey.FEDIVERSE_TRENDING_LINKS,
    StorageKey.FEDIVERSE_TRENDING_TAGS,
    StorageKey.FEDIVERSE_TRENDING_TOOTS,
];

// Self explanatory
export enum MediaCategory {
    AUDIO = "audio",
    IMAGE = "image",
    VIDEO = "video",
};


// Records
export type AccountLike = Account | mastodon.v1.Account | mastodon.v1.StatusMention;  // TODO: unused
export type AccountNames = Record<mastodon.v1.Account["acct"], Account>;
export type ApiMutex = Record<StorageKey, Mutex>;
export type MastodonInstances = Record<string, MastodonInstance | MastodonInstanceEmpty>;
export type NumericFilters = Record<WeightName, NumericFilter>;
export type PropertyFilters = Record<PropertyName, PropertyFilter>;
export type ScorerDict = Record<WeightName, WeightInfo>;
export type StringNumberDict = Record<string, number>;
export type TagNames = Record<string, TagWithUsageCounts>;
export type Weights = Record<WeightName, number>;

// Misc
export type CountKey = FilterTitle | string;
export type FeedFetcher = (api: mastodon.rest.Client) => Promise<Toot[]>;
export type FilterTitle = PropertyName | WeightName;
export type StatusList = TootLike[];
export type TootLike = mastodon.v1.Status | SerializableToot | Toot;

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

export type InstanceResponse = MastodonInstance | null;

export type MastodonApiObject = (
    MastodonObjWithID |
    mastodon.v1.Tag |
    mastodon.v1.TrendLink
);

export type MastoApiObject = (
    Account |
    MastodonApiObject |
    Toot
);

// All these types have an id property
export type MastodonObjWithID = (
    SerializableToot |
    mastodon.v1.Account |
    mastodon.v1.Notification |
    mastodon.v1.Status |
    mastodon.v2.Filter
);

export interface MastodonInstance extends mastodon.v2.Instance {
    followedPctOfMAU?: number;
    MAU?: number;  // MAU data is buried in the Instance hierarchy so this just a copy on the top level
};

export type MastodonInstanceEmpty = {
    followedPctOfMAU?: number;
    MAU?: number;
};

export type MastodonTag = mastodon.v1.Tag | TagWithUsageCounts;

export type StorableApiObject = (
    Account |
    MastodonObjWithID |
    MastodonApiObject |
    MastodonTag |
    Toot |
    TrendingLink
);

// Types that are valid for browser local storage
export type StorableObj = (
    FeedFilterSettingsSerialized |
    MastodonInstances |
    StorableApiObject |
    StorableApiObject[] |
    StringNumberDict |
    Weights |
    number
);

export type StorableObjWithCache = (
    MastodonInstances |
    StorableApiObject[]
);

export type StorableWithTimestamp = {
    updatedAt: string;
    value: StorableObj;
};

export interface TagWithUsageCounts extends mastodon.v1.Tag {
    numAccounts?: number;
    numToots?: number;
};

export type TootScore = {
    rawScore: number;             // Raw score without time decay etc. applied
    rawScores: Weights;
    score: number;                // Actual final score
    timeDecayMultiplier: number;  // Multiplier that reduces the score of older posts
    trendingMultiplier: number;   // Multiplier applied to trending toots and tags
    weightedScore: number;        // Score before applying timeDecayMultiplier
    weightedScores: Weights;
};

export interface TrendingLink extends mastodon.v1.TrendLink {
    numToots?: number;
    numAccounts?: number;
};

export interface TrendingStorage {
    links: TrendingLink[];
    toots: Toot[];
    tags: TagWithUsageCounts[];
};

export type TrendingWithHistory = TagWithUsageCounts | TrendingLink;
export type TrendingObj = TrendingWithHistory | Toot;

export type WeightInfo = {
    description: string;
    minValue?: number;
    scorer?: Scorer;
};


// TODO: unused stuff below here
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
