/*
 * Typescript type definitions.
 */
import { mastodon } from 'masto';
import { Mutex } from 'async-mutex';

import Account from './api/objects/account';
import BooleanFilter, { BooleanFilterArgs, BooleanFilterName } from './filters/boolean_filter';
import NumericFilter, { NumericFilterArgs } from './filters/numeric_filter';
import Scorer from './scorer/scorer';
import Toot, { SerializableToot } from './api/objects/toot';

export enum ScoreName {
    ALREADY_SHOWN = 'AlreadyShown',
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
};

export enum NonScoreWeightName {
    TIME_DECAY = 'TimeDecay',
    TRENDING = 'Trending',
    OUTLIER_DAMPENER = 'OutlierDampener',
};

// Names of the user adjustable score weightings
export type WeightName = ScoreName | NonScoreWeightName;

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
    FOLLOWED_TAGS = ScoreName.FOLLOWED_TAGS,
    HASHTAG_TOOTS = 'HashtagToots',  // TODO: there's nothing actually stored here but it's a flag for Toot serialization
    HOME_TIMELINE = 'HomeTimeline',  // Just toots that are in the home timeline (followed accounts + tags)
    MUTED_ACCOUNTS = 'MutedAccounts',
    NOTIFICATIONS = 'Notifications',
    PARTICIPATED_TAG_TOOTS = 'ParticipatedHashtagToots',
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
export type AccountNames = Record<mastodon.v1.Account["acct"], Account>;
export type ApiMutex = Record<StorageKey, Mutex>;
export type MastodonInstances = Record<string, MastodonInstance | MastodonInstanceEmpty>;
export type StringNumberDict = Record<string, number>;
export type TagNames = Record<string, TagWithUsageCounts>;
export type Weights = Record<WeightName, number>;
export type WeightInfoDict = Record<WeightName, WeightInfo>;

// Misc
export type AccountLike = Account | mastodon.v1.Account;
export type CountKey = FilterTitle | string;
export type FeedFetcher = (api: mastodon.rest.Client) => Promise<Toot[]>;
export type FilterTitle = BooleanFilterName | WeightName;
export type StatusList = TootLike[];
export type TootLike = mastodon.v1.Status | SerializableToot | Toot;


// Filters
export type BooleanFilters = Record<BooleanFilterName, BooleanFilter>;
export type NumericFilters = Record<WeightName, NumericFilter>;

export type FeedFilterSettingsSerialized = {
    booleanFilterArgs: BooleanFilterArgs[];
    numericFilterArgs: NumericFilterArgs[];
};

// Same as FeedFilterSettingsSerialized but with the filter objects as well as the args needed to construct them
export interface FeedFilterSettings extends FeedFilterSettingsSerialized {
    booleanFilters: BooleanFilters;
    numericFilters: NumericFilters;
};

export type FilterArgs = {
    title: FilterTitle;
    description?: string;
    invertSelection?: boolean;
    visible?: boolean;
};

export type InstanceResponse = MastodonInstance | null;

// Extract the keys of SerializableToot that are of a type that's a subclsas of TypeCondition
// https://www.totaltypescript.com/get-keys-of-an-object-where-values-are-of-a-given-type
export type KeysOfValueType<T, SuperClass> = Exclude<
    {[K in keyof T]: T[K] extends SuperClass ? K : never}[keyof T],
    undefined
>;

export type MastodonApiObject = (
    MastodonObjWithID |
    mastodon.v1.Tag |
    mastodon.v1.TrendLink
);

// All these types have an id property
export type MastodonObjWithID = (
    Account |
    TootLike |
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

export interface MinMax {
    min: number;
    max: number;
};

export interface MinMaxAvg extends MinMax {
    average: number;
    count: number;
};

export type MinMaxID = {
    min: string;
    max: string;
};

export type StorableApiObject = (
    MastodonObjWithID |
    MastodonTag |
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
