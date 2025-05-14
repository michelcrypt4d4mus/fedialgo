import { mastodon } from 'masto';
import { Mutex } from 'async-mutex';
import Account from './api/objects/account';
import NumericFilter, { NumericFilterArgs } from './filters/numeric_filter';
import PropertyFilter, { PropertyFilterArgs, PropertyName } from './filters/property_filter';
import Scorer from './scorer/scorer';
import Toot, { SerializableToot } from './api/objects/toot';
export declare enum WeightName {
    CHAOS = "Chaos",
    DIVERSITY = "Diversity",
    FAVOURITED_ACCOUNTS = "FavouritedAccounts",
    FAVOURITED_TAGS = "FavouritedTags",
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
    VIDEO_ATTACHMENTS = "VideoAttachments",
    OUTLIER_DAMPENER = "OutlierDampener",
    TIME_DECAY = "TimeDecay",
    TRENDING = "Trending"
}
export declare const NON_SCORE_WEIGHTS: WeightName[];
export declare const TRENDING_WEIGHTS: WeightName[];
export declare enum StorageKey {
    APP_OPENS = "AppOpens",
    BLOCKED_ACCOUNTS = "BlockedAccounts",
    FAVOURITED_TOOTS = "FavouritedToots",
    FEDIVERSE_POPULAR_SERVERS = "FediversePopularServers",
    FEDIVERSE_TRENDING_TAGS = "FediverseTrendingTags",
    FEDIVERSE_TRENDING_LINKS = "FediverseTrendingLinks",
    FEDIVERSE_TRENDING_TOOTS = "FediverseTrendingToots",
    FILTERS = "Filters",
    FOLLOWED_ACCOUNTS = "FollowedAccounts",
    FOLLOWED_TAGS = "FollowedTags",
    HASHTAG_TOOTS = "HashtagToots",
    HOME_TIMELINE = "HomeTimeline",
    MUTED_ACCOUNTS = "MutedAccounts",
    PARTICIPATED_TAG_TOOTS = "ParticipatedHashtagToots",
    RECENT_NOTIFICATIONS = "RecentNotifications",
    RECENT_USER_TOOTS = "RecentUserToots",
    SERVER_SIDE_FILTERS = "ServerFilters",
    TIMELINE = "Timeline",
    TRENDING_TAG_TOOTS = "TrendingTagToots",
    USER = "FedialgoUser",
    WEIGHTS = "Weights"
}
export declare const FEDIVERSE_KEYS: StorageKey[];
export declare enum MediaCategory {
    AUDIO = "audio",
    IMAGE = "image",
    VIDEO = "video"
}
export type AccountLike = Account | mastodon.v1.Account | mastodon.v1.StatusMention;
export type AccountNames = Record<mastodon.v1.Account["acct"], Account>;
export type ApiMutex = Record<StorageKey, Mutex>;
export type MastodonInstances = Record<string, MastodonInstance | MastodonInstanceEmpty>;
export type NumericFilters = Record<WeightName, NumericFilter>;
export type PropertyFilters = Record<PropertyName, PropertyFilter>;
export type ScorerDict = Record<WeightName, WeightInfo>;
export type StringNumberDict = Record<string, number>;
export type TagNames = Record<string, TagWithUsageCounts>;
export type Weights = Record<WeightName, number>;
export type CountKey = FilterTitle | string;
export type FeedFetcher = (api: mastodon.rest.Client) => Promise<Toot[]>;
export type FilterTitle = PropertyName | WeightName;
export type StatusList = TootLike[];
export type TootLike = mastodon.v1.Status | SerializableToot | Toot;
export interface FeedFilterSettings extends FeedFilterSettingsSerialized {
    filterSections: PropertyFilters;
    numericFilters: NumericFilters;
}
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
export type MastodonApiObject = (MastodonObjWithID | mastodon.v1.Tag | mastodon.v1.TrendLink);
export type MastoApiObject = (Account | MastodonApiObject | Toot);
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
export type MinMaxID = {
    min: string;
    max: string;
};
export type StorableApiObject = (Account | MastodonObjWithID | MastodonApiObject | MastodonTag | Toot | TrendingLink);
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
    rawScores: Weights;
    score: number;
    timeDecayMultiplier: number;
    trendingMultiplier: number;
    weightedScore: number;
    weightedScores: Weights;
};
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
export type WeightInfo = {
    description: string;
    minValue?: number;
    scorer?: Scorer;
};
