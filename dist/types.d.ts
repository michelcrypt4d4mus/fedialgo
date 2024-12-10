import { mastodon } from 'masto';
import NumericFilter, { NumericFilterArgs } from './filters/numeric_filter';
import PropertyFilter, { PropertyFilterArgs, PropertyName } from './filters/property_filter';
import Scorer from './scorer/scorer';
import Toot from './api/objects/toot';
export declare enum Key {
    FILTERS = "filters",
    FOLLOWED_ACCOUNTS = "FollowedAccounts",
    HOME_TIMELINE = "homeTimeline",
    LAST_OPENED = "lastOpened",
    OPENINGS = "openings",
    POPULAR_SERVERS = "popularServers",
    RECENT_FAVOURITES = "recentFavourites",
    RECENT_NOTIFICATIONS = "recentNotifications",
    RECENT_TOOTS = "recentToots",
    RECENT_USER_TOOTS = "recentUserToots",
    SERVER_SIDE_FILTERS = "serverFilters",
    TIMELINE = "timeline",
    USER = "algouser",
    WEIGHTS = "weights"
}
export declare enum WeightName {
    CHAOS = "Chaos",
    DIVERSITY = "Diversity",
    FAVORITED_ACCOUNTS = "FavoritedAccounts",
    FOLLOWED_TAGS = "FollowedTags",
    IMAGE_ATTACHMENTS = "ImageAttachments",
    INTERACTIONS = "Interactions",
    MOST_REPLIED_ACCOUNTS = "MostRepliedAccounts",
    MOST_RETOOTED_ACCOUNTS = "MostRetootedAccounts",
    NUM_FAVOURITES = "NumFavourites",
    NUM_REPLIES = "NumReplies",
    NUM_RETOOTS = "NumRetoots",
    RETOOTED_IN_FEED = "RetootedInFeed",
    TIME_DECAY = "TimeDecay",
    TRENDING_TAGS = "TrendingTags",
    TRENDING_TOOTS = "TrendingToots",
    VIDEO_ATTACHMENTS = "VideoAttachments"
}
export type AccountNames = Record<mastodon.v1.Account["acct"], mastodon.v1.Account>;
export type ScorerDict = Record<WeightName, ScorerInfo>;
export type StringNumberDict = Record<string, number>;
export type Weights = Record<WeightName, number>;
export type TootURIs = Record<mastodon.v1.Status["uri"], mastodon.v1.Status | Toot>;
export interface AlgorithmArgs {
    api: mastodon.rest.Client;
    user: mastodon.v1.Account;
    setFeedInApp?: (feed: Toot[]) => void;
}
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
    numTrendingTags: number;
    numTrendingTagsPerServer: number;
    numTrendingTagsToots: number;
    numTrendingTootsPerServer: number;
    defaultServers: string[];
    noMauServers: string[];
};
export type CountKey = FilterTitle | string;
export type FeedFetcher = (api: mastodon.rest.Client) => Promise<Toot[]>;
export type FilterTitle = PropertyName | WeightName;
export type StorageKey = Key | WeightName;
export type FeedFilterSettingsSerialized = {
    feedFilterSectionArgs: PropertyFilterArgs[];
    numericFilterArgs: NumericFilterArgs[];
};
export interface FeedFilterSettings extends FeedFilterSettingsSerialized {
    filterSections: Record<PropertyName, PropertyFilter>;
    numericFilters: Record<WeightName, NumericFilter>;
}
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
    homeToots: Toot[];
    otherToots: Toot[];
};
export type UserData = {
    followedAccounts: AccountNames;
    followedTags: StringNumberDict;
    serverSideFilters: mastodon.v2.Filter[];
};
export interface TootExtension extends mastodon.v1.Status {
    followedTags?: mastodon.v1.Tag[];
    isFollowed?: boolean;
    reblog?: TootExtension | null;
    reblogBy?: mastodon.v1.Account;
    scoreInfo?: TootScore;
    trendingRank?: number;
    trendingTags?: TrendingTag[];
}
export type TootScore = {
    rawScore: number;
    rawScores: Weights;
    score: number;
    timeDecayMultiplier: number;
    weightedScores: Weights;
};
export interface TrendingTag extends mastodon.v1.Tag {
    numAccounts?: number;
    numToots?: number;
    trendingRank?: number;
}
export type StorageValue = FeedFilterSettings | FeedFilterSettingsSerialized | StringNumberDict | TootExtension[] | TootURIs | Weights | mastodon.v1.Account | mastodon.v1.Account[] | mastodon.v2.Filter[] | number;
