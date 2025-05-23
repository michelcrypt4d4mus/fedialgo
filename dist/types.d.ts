import { mastodon } from 'masto';
import { Mutex } from 'async-mutex';
import Account from './api/objects/account';
import BooleanFilter, { BooleanFilterArgs, BooleanFilterName } from './filters/boolean_filter';
import NumericFilter, { NumericFilterArgs } from './filters/numeric_filter';
import Scorer from './scorer/scorer';
import Toot, { SerializableToot } from './api/objects/toot';
export declare enum ScoreName {
    ALREADY_SHOWN = "AlreadyShown",
    CHAOS = "Chaos",
    DIVERSITY = "Diversity",
    FAVOURITED_ACCOUNTS = "FavouritedAccounts",
    FAVOURITED_TAGS = "FavouritedTags",
    FOLLOWED_ACCOUNTS = "FollowedAccounts",
    FOLLOWED_TAGS = "FollowedTags",
    IMAGE_ATTACHMENTS = "ImageAttachments",
    INTERACTIONS = "Interactions",
    MENTIONS_FOLLOWED = "MentionsFollowed",
    MOST_REPLIED_ACCOUNTS = "MostRepliedAccounts",
    MOST_RETOOTED_ACCOUNTS = "MostRetootedAccounts",
    NUM_FAVOURITES = "NumFavourites",
    NUM_REPLIES = "NumReplies",
    NUM_RETOOTS = "NumRetoots",
    PARTICIPATED_TAGS = "ParticipatedTags",
    RETOOTED_IN_FEED = "RetootedInFeed",
    TRENDING_LINKS = "TrendingLinks",
    TRENDING_TAGS = "TrendingTags",
    TRENDING_TOOTS = "TrendingToots",
    VIDEO_ATTACHMENTS = "VideoAttachments"
}
export declare enum NonScoreWeightName {
    TIME_DECAY = "TimeDecay",
    TRENDING = "Trending",
    OUTLIER_DAMPENER = "OutlierDampener"
}
export type WeightName = ScoreName | NonScoreWeightName;
export declare enum CacheKey {
    BLOCKED_ACCOUNTS = "BlockedAccounts",
    FAVOURITED_TOOTS = "FavouritedToots",
    FEDIVERSE_POPULAR_SERVERS = "FediversePopularServers",
    FEDIVERSE_TRENDING_TAGS = "FediverseTrendingTags",
    FEDIVERSE_TRENDING_LINKS = "FediverseTrendingLinks",
    FEDIVERSE_TRENDING_TOOTS = "FediverseTrendingToots",
    FOLLOWED_ACCOUNTS = "FollowedAccounts",
    FOLLOWED_TAGS = "FollowedTags",
    HASHTAG_TOOTS = "HashtagToots",
    HOME_TIMELINE = "HomeTimeline",
    MUTED_ACCOUNTS = "MutedAccounts",
    NOTIFICATIONS = "Notifications",
    PARTICIPATED_TAG_TOOTS = "ParticipatedHashtagToots",
    RECENT_USER_TOOTS = "RecentUserToots",
    SERVER_SIDE_FILTERS = "ServerFilters",
    TIMELINE = "Timeline",
    TRENDING_TAG_TOOTS = "TrendingTagToots"
}
export declare enum AlgorithmStorageKey {
    APP_OPENS = "AppOpens",
    FILTERS = "Filters",
    USER = "FedialgoUser",
    WEIGHTS = "Weights"
}
export type StorageKey = AlgorithmStorageKey | CacheKey;
export declare const FEDIVERSE_KEYS: CacheKey[];
export declare enum MediaCategory {
    AUDIO = "audio",
    IMAGE = "image",
    VIDEO = "video"
}
export type AccountNames = Record<mastodon.v1.Account["acct"], Account>;
export type ApiMutex = Record<CacheKey, Mutex>;
export type MastodonInstances = Record<string, MastodonInstance | MastodonInstanceEmpty>;
export type NonScoreWeightInfoDict = Record<NonScoreWeightName, WeightInfo>;
export type StringNumberDict = Record<string, number>;
export type TagNames = Record<string, TagWithUsageCounts>;
export type Weights = Record<WeightName, number>;
export type WeightInfoDict = Record<WeightName, WeightInfo>;
export type AccountLike = Account | mastodon.v1.Account;
export type CountKey = FilterTitle | string;
export type FeedFetcher = (api: mastodon.rest.Client) => Promise<Toot[]>;
export type FilterTitle = BooleanFilterName | TootNumberProp;
export type StatusList = TootLike[];
export type StringSet = Set<string | undefined>;
export type TootLike = mastodon.v1.Status | SerializableToot | Toot;
export type TootNumberProp = KeysOfValueType<Toot, number>;
export type BooleanFilters = Record<BooleanFilterName, BooleanFilter>;
export type NumericFilters = Record<TootNumberProp, NumericFilter>;
export type FeedFilterSettingsSerialized = {
    booleanFilterArgs: BooleanFilterArgs[];
    numericFilterArgs: NumericFilterArgs[];
};
export interface FeedFilterSettings extends FeedFilterSettingsSerialized {
    booleanFilters: BooleanFilters;
    numericFilters: NumericFilters;
}
export type FilterArgs = {
    title: FilterTitle;
    description?: string;
    invertSelection?: boolean;
    visible?: boolean;
};
export type KeysOfValueType<T, SuperClass> = Exclude<{
    [K in keyof T]: T[K] extends SuperClass ? K : never;
}[keyof T], undefined>;
export type MastodonApiObject = (MastodonObjWithID | mastodon.v1.Tag | mastodon.v1.TrendLink);
export type MastodonObjWithID = (Account | TootLike | mastodon.v1.Account | mastodon.v1.Notification | mastodon.v1.Status | mastodon.v2.Filter);
export interface MastodonInstance extends mastodon.v2.Instance {
    followedPctOfMAU?: number;
    MAU?: number;
}
export type MastodonInstanceEmpty = {
    followedPctOfMAU?: number;
    MAU?: number;
};
export type MastodonTag = mastodon.v1.Tag | TagWithUsageCounts;
export interface MinMax {
    min: number;
    max: number;
}
export interface MinMaxAvgScore extends MinMax {
    average: number;
    count: number;
    averageFinalScore: number;
}
export type MinMaxID = {
    min: string;
    max: string;
};
export type ScoreStats = {
    raw: MinMaxAvgScore[];
    weighted: MinMaxAvgScore[];
};
export type ScoresStats = Record<ScoreName, ScoreStats>;
export type StorableApiObject = (MastodonObjWithID | MastodonTag | TrendingLink);
export type StorableObj = (FeedFilterSettingsSerialized | MastodonInstances | StorableApiObject | StorableApiObject[] | StringNumberDict | Weights | number);
export type StorableObjWithCache = (MastodonInstances | StorableApiObject[]);
export type StorableWithTimestamp = {
    updatedAt: string;
    value: StorableObj;
};
export interface TagWithUsageCounts extends mastodon.v1.Tag {
    numAccounts?: number;
    numToots?: number;
}
export type TootScore = {
    rawScore: number;
    score: number;
    scores: TootScores;
    timeDecayMultiplier: number;
    trendingMultiplier: number;
    weightedScore: number;
};
export type TootScores = Record<ScoreName, WeightedScore>;
export interface TrendingLink extends mastodon.v1.TrendLink {
    numToots?: number;
    numAccounts?: number;
}
export interface TrendingStorage {
    links: TrendingLink[];
    toots: Toot[];
    tags: TagWithUsageCounts[];
}
export type TrendingWithHistory = TagWithUsageCounts | TrendingLink;
export type TrendingObj = TrendingWithHistory | Toot;
export type WeightedScore = {
    raw: number;
    weighted: number;
};
export type WeightInfo = {
    description: string;
    minValue?: number;
    scorer?: Scorer;
};
