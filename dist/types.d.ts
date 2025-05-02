import { mastodon } from 'masto';
import Account from './api/objects/account';
import NumericFilter, { NumericFilterArgs } from './filters/numeric_filter';
import PropertyFilter, { PropertyFilterArgs, PropertyName } from './filters/property_filter';
import Scorer from './scorer/scorer';
import Toot, { SerializableToot } from './api/objects/toot';
export declare enum WeightName {
    CHAOS = "Chaos",
    DIVERSITY = "Diversity",
    FAVOURITED_ACCOUNTS = "FavouritedAccounts",
    FOLLOWED_TAGS = "FollowedTags",
    HASHTAG_PARTICIPATION = "HashtagParticipation",
    IMAGE_ATTACHMENTS = "ImageAttachments",
    INTERACTIONS = "Interactions",
    MENTIONS_FOLLOWED = "MentionsFollowed",
    MOST_REPLIED_ACCOUNTS = "MostRepliedAccounts",
    MOST_RETOOTED_ACCOUNTS = "MostRetootedAccounts",
    NUM_FAVOURITES = "NumFavourites",
    NUM_REPLIES = "NumReplies",
    NUM_RETOOTS = "NumRetoots",
    RETOOTED_IN_FEED = "RetootedInFeed",
    TRENDING_LINKS = "TrendingLinks",
    TRENDING_TAGS = "TrendingTags",
    TRENDING_TOOTS = "TrendingToots",
    VIDEO_ATTACHMENTS = "VideoAttachments",
    TIME_DECAY = "TimeDecay",
    TRENDING = "Trending"
}
export declare enum StorageKey {
    BLOCKED_ACCOUNTS = "BlockedAccounts",
    FAVOURITED_ACCOUNTS = "FavouritedAccounts",
    FEDIVERSE_TRENDING_TAGS = "FediverseTrendingTags",
    FEDIVERSE_TRENDING_LINKS = "FediverseTrendingLinks",
    FEDIVERSE_TRENDING_TOOTS = "FediverseTrendingToots",
    FILTERS = "Filters",
    FOLLOWED_ACCOUNTS = "FollowedAccounts",
    FOLLOWED_TAGS = "FollowedTags",
    HASHTAG_PARTICIPATION = "HashtagParticipation",
    HOME_TIMELINE = "HomeTimeline",
    LAST_OPENED = "LastOpened",
    MUTED_ACCOUNTS = "MutedAccounts",
    OPENINGS = "Openings",
    POPULAR_SERVERS = "PopularServers",
    RECENT_NOTIFICATIONS = "RecentNotifications",
    RECENT_USER_TOOTS = "RecentUserToots",
    SERVER_SIDE_FILTERS = "ServerFilters",
    TIMELINE = "Timeline",
    TRENDING_TAG_TOOTS = "TrendingTagToots",
    TRENDING_TAG_TOOTS_V2 = "TrendingTagTootsV2",
    USER = "FedialgoUser",
    WEIGHTS = "Weights"
}
export declare enum MediaCategory {
    AUDIO = "audio",
    IMAGE = "image",
    VIDEO = "video"
}
export type AccountLike = Account | mastodon.v1.Account | mastodon.v1.StatusMention;
export type AccountNames = Record<mastodon.v1.Account["acct"], Account>;
export type MastodonServersInfo = Record<string, MastodonServerInfo>;
export type NumericFilters = Record<WeightName, NumericFilter>;
export type PropertyFilters = Record<PropertyName, PropertyFilter>;
export type ScorerDict = Record<WeightName, ScorerInfo>;
export type StatusList = TootLike[];
export type StringNumberDict = Record<string, number>;
export type TootLike = mastodon.v1.Status | Toot;
export type Weights = Record<WeightName, number>;
export type CountKey = FilterTitle | string;
export type FeedFetcher = (api: mastodon.rest.Client) => Promise<Toot[]>;
export type FilterTitle = PropertyName | WeightName;
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
export type StorableObj = (FeedFilterSettingsSerialized | MastodonServersInfo | SerializableToot[] | StringNumberDict | TrendingLink[] | TrendingTag[] | Weights | mastodon.v1.Account | mastodon.v1.Account[] | mastodon.v2.Filter[] | mastodon.v1.Tag[] | number);
export type MastodonID = (mastodon.v1.Account | mastodon.v1.Notification | SerializableToot);
export type StorableWithTimestamp = {
    updatedAt: string;
    value: StorableObj;
};
export type TimelineData = {
    homeToots: Toot[];
    otherToots: Toot[];
    trendingToots?: Toot[];
};
export type TootScore = {
    rawScore: number;
    rawScores: Weights;
    score: number;
    timeDecayMultiplier: number;
    weightedScore: number;
    weightedScores: Weights;
};
export interface TrendingLink extends mastodon.v1.TrendLink {
    numToots?: number;
    numAccounts?: number;
}
export interface TrendingTag extends mastodon.v1.Tag {
    numAccounts?: number;
    numToots?: number;
    trendingRank?: number;
}
export interface TrendingStorage {
    links: TrendingLink[];
    toots: Toot[];
    tags: TrendingTag[];
}
export type TrendingWithHistory = TrendingLink | TrendingTag;
export type TrendingObj = TrendingWithHistory | Toot;
export type UserData = {
    followedAccounts: AccountNames;
    followedTags: mastodon.v1.Tag[];
    mutedAccounts: AccountNames;
    serverSideFilters: mastodon.v2.Filter[];
};
