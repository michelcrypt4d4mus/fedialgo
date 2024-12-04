import { mastodon } from 'masto';

import Scorer from './scorer/scorer';


export type AccountFeature = {
    [key: mastodon.v1.Account["acct"]]: number;
};

export type AccountNames = {
    [key: mastodon.v1.Account["acct"]]: mastodon.v1.Account;
};

export interface AlgorithmArgs {
    api: mastodon.rest.Client;
    user: mastodon.v1.Account;
    setFeedInApp?: (feed: Toot[]) => void;  // Optional callback to set the feed in the code using this package
};

export type Config = {
    // Timeline
    defaultRecordsPerPage: number;         // DEFAULT_RECORDS_PER_PAGE
    maxTimelineTootsToFetch: number;       // MAX_TIMELINE_TOOTS_TO_FETCH
    maxTimelineHoursToFetch: number;       // MAX_TIMELINE_HOURS_TO_FETCH
    reloadIfOlderThanMinutes: number;      // currently unused
    defaultLanguage: string;               // Toots without language set will be set to this language

    // Tag filters
    minTootsForTagToAppearInFilter: number;  // MINIMUM_TAGS_FOR_FILTER

    // API stuff
    minRecordsForFeatureScoring: number;  // DEFAULT_MIN_RECORDS_FOR_FEATURE
    maxFollowingAccountsToPull: number;   // MAX_FOLLOWING_ACCOUNT_TO_PULL
    reloadFeaturesEveryNthOpen: number;   // RELOAD_FEATURES_EVERY_NTH_OPEN
    numServersToCheck: number;            // NUM_SERVERS_TO_CHECK
    minServerMAU: number;                 // MINIMUM_MAU

    // Trending tags
    numDaysToCountTrendingTagData: number; // const NUM_DAYS_TO_COUNT_TAG_DATA = 3;
    numTrendingTags: number;               // const NUM_TRENDING_TAGS = 20;
    numTrendingTagsPerServer: number;      // defaults to 10: https://docs.joinmastodon.org/methods/trends/
    numTrendingTagsToots: number;           // const NUM_TRENDING_TAG_TOOTS = 100;
    numTrendingTagsTootsPerServer: number;  // const NUM_TRENDING_TAG_TOOTS_PER_SERVER = 20;

    // Trending toots
    numTrendingTootsPerServer: number;      // NUM_TRENDING_TOOTS_PER_SERVER
};

export type FeedFeature = AccountFeature | StringNumberDict;
export type FeedFetcher = (api: mastodon.rest.Client) => Promise<Toot[]>;

export type FeedFilterSettings = {
    filteredApps: string[];
    filteredLanguages: string[];
    filteredTags: string[];
    includeFollowedAccounts: boolean;
    includeFollowedHashtags: boolean;
    includeReplies: boolean;
    includeReposts: boolean;
    includeTrendingHashTags: boolean;
    includeTrendingToots: boolean;
    onlyLinks: boolean;
    suppressSelectedTags: boolean;   // flips the tag whitelist to be a blacklist
    weightLearningEnabled: boolean;  // TODO: this isn't a filter
};

export type ScorerDict = {
    [key: string]: ScorerInfo;
};

export type ScorerInfo = {
    defaultWeight: number;
    description: string;
    scorer?: Scorer;
};

export type ServerFeature = {
    [key: mastodon.v1.Instance["uri"]]: number;
};

export interface StringNumberDict {
    [key: string]: number;
};

export interface Toot extends mastodon.v1.Status {
    followedTags?: mastodon.v1.Tag[];  // Array of tags that the user follows that exist in this toot
    reblog?: Toot;
    reblogBy?: mastodon.v1.Account;
    scoreInfo?: TootScore;
    similarity?: number;
    trendingRank?: number;         // Most trending on a server gets a 10, next is a 9, etc.
    trendingTags?: TrendingTag[];  // Tags that are trending in this toot
};

export type TootScore = {
    rawScore: number;  // Score before applying timeDecayMultiplier
    rawScores: StringNumberDict;
    score: number;
    timeDecayMultiplier: number;  // Multiplier that reduces the score of older posts
    weightedScores: StringNumberDict;
};

export type TootURIs = {
    [key: mastodon.v1.Status["uri"]]: mastodon.v1.Status | Toot;
};

export interface TrendingTag extends mastodon.v1.Tag {
    numAccounts?: number;
    numToots?: number;
    trendingRank?: number;
};

export type StorageValue = FeedFeature | FeedFilterSettings | ServerFeature | TootURIs |
    Toot[] | mastodon.v1.Account | mastodon.v1.Account[] | number;
