import { mastodon } from 'masto';
import NumericFilter, { NumericFilterArgs } from './filters/numeric_filter';
import PropertyFilter, { PropertyFilterArgs, PropertyName } from './filters/property_filter';
import Scorer from './scorer/scorer';
import Toot, { SerializableToot } from './api/objects/toot';
export declare enum WeightName {
    CHAOS = "Chaos",
    DIVERSITY = "Diversity",
    FAVOURITED_ACCOUNTS = "FavouritedAccounts",
    FOLLOWED_TAGS = "FollowedTags",
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
    FILTERS = "Filters",
    FOLLOWED_ACCOUNTS = "FollowedAccounts",
    FOLLOWED_TAGS = "FollowedTags",
    HOME_TIMELINE = "HomeTimeline",
    LAST_OPENED = "LastOpened",
    MUTED_ACCOUNTS = "MutedAccounts",
    OPENINGS = "Openings",
    POPULAR_SERVERS = "PopularServers",
    RECENT_FAVOURITES = "RecentFavourites",
    RECENT_NOTIFICATIONS = "RecentNotifications",
    RECENT_TOOTS = "RecentToots",
    RECENT_USER_TOOTS = "RecentUserToots",
    SERVER_SIDE_FILTERS = "ServerFilters",
    TIMELINE = "Timeline",
    TRENDING = "Trending",
    USER = "FedialgoUser",
    WEIGHTS = "Weights"
}
export declare enum MediaCategory {
    AUDIO = "audio",
    IMAGE = "image",
    VIDEO = "video"
}
export type AccountLike = mastodon.v1.Account | mastodon.v1.StatusMention;
export type AccountNames = Record<mastodon.v1.Account["acct"], mastodon.v1.Account>;
export type ScorerDict = Record<WeightName, ScorerInfo>;
export type StatusList = mastodon.v1.Status[] | Toot[];
export type StringNumberDict = Record<string, number>;
export type Weights = Record<WeightName, number>;
export type TootURIs = Record<mastodon.v1.Status["uri"], mastodon.v1.Status | Toot>;
export type CountKey = FilterTitle | string;
export type FeedFetcher = (api: mastodon.rest.Client) => Promise<Toot[]>;
export type FilterTitle = PropertyName | WeightName;
export type Config = {
    defaultLanguage: string;
    defaultRecordsPerPage: number;
    maxNumCachedToots: number;
    enableIncrementalLoad: boolean;
    incrementalLoadDelayMS: number;
    maxTimelineHoursToFetch: number;
    maxTimelineTootsToFetch: number;
    numTootsInFirstFetch: number;
    minRecordsForFeatureScoring: number;
    maxFollowingAccountsToPull: number;
    reloadFeaturesEveryNthOpen: number;
    numServersToCheck: number;
    minServerMAU: number;
    numTootsPerTrendingTag: number;
    numDaysToCountTrendingTagData: number;
    numTrendingLinksPerServer: number;
    numTrendingTags: number;
    numTrendingTagsPerServer: number;
    numTrendingTagsToots: number;
    numTrendingTootsPerServer: number;
    defaultServers: string[];
    noMauServers: string[];
};
export interface FeedFilterSettings extends FeedFilterSettingsSerialized {
    filterSections: Record<PropertyName, PropertyFilter>;
    numericFilters: Record<WeightName, NumericFilter>;
}
export type FeedFilterSettingsSerialized = {
    feedFilterSectionArgs: PropertyFilterArgs[];
    numericFilterArgs: NumericFilterArgs[];
};
export type FilterArgs = {
    title: PropertyName | WeightName;
    description?: string;
    invertSelection?: boolean;
    visible?: boolean;
};
export type ScorerInfo = {
    description: string;
    minValue?: number;
    scorer?: Scorer;
};
export type StorableObj = (FeedFilterSettings | FeedFilterSettingsSerialized | StringNumberDict | SerializableToot[] | TootURIs | TrendingStorage | Weights | mastodon.v1.Account | mastodon.v1.Account[] | mastodon.v2.Filter[] | mastodon.v1.TrendLink[] | number);
export type TimelineData = {
    homeToots: Toot[];
    otherToots: Toot[];
    trendingLinks?: TrendingLink[];
    trendingTags?: TrendingTag[];
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
export type UserData = {
    mutedAccounts: AccountNames;
    serverSideFilters: mastodon.v2.Filter[];
};
