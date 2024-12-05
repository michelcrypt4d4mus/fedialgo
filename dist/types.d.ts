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
    setFeedInApp?: (feed: Toot[]) => void;
}
export type Config = {
    defaultRecordsPerPage: number;
    maxTimelineTootsToFetch: number;
    maxTimelineHoursToFetch: number;
    reloadIfOlderThanMinutes: number;
    defaultLanguage: string;
    minTootsForTagToAppearInFilter: number;
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
    suppressSelectedTags: boolean;
    weightLearningEnabled: boolean;
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
}
export interface Toot extends mastodon.v1.Status {
    followedTags?: mastodon.v1.Tag[];
    reblog?: Toot;
    reblogBy?: mastodon.v1.Account;
    scoreInfo?: TootScore;
    similarity?: number;
    trendingRank?: number;
    trendingTags?: TrendingTag[];
}
export type TootScore = {
    rawScore: number;
    rawScores: StringNumberDict;
    score: number;
    timeDecayMultiplier: number;
    weightedScores: StringNumberDict;
};
export type TootURIs = {
    [key: mastodon.v1.Status["uri"]]: mastodon.v1.Status | Toot;
};
export interface TrendingTag extends mastodon.v1.Tag {
    numAccounts?: number;
    numToots?: number;
    trendingRank?: number;
}
export type StorageValue = FeedFeature | FeedFilterSettings | ServerFeature | TootURIs | Toot[] | mastodon.v1.Account | mastodon.v1.Account[] | number;
