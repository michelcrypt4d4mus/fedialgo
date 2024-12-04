import { mastodon } from 'masto';

import Scorer from './scorer/Scorer';


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

export type FeedFeature = AccountFeature | StringNumberDict;

export type FeedFilterSettings = {
    filteredApps: string[];
    filteredLanguages: string[];
    includeFollowedAccounts: boolean;
    includeFollowedHashtags: boolean;
    includeReplies: boolean;
    includeReposts: boolean;
    includeTrendingHashTags: boolean;
    includeTrendingToots: boolean;
    onlyLinks: boolean;
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
    recommended?: boolean;
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
    trendingRank?: number;
    numToots?: number;
    numAccounts?: number;
};

export type FeedFetcher = (api: mastodon.rest.Client) => Promise<Toot[]>;

export type StorageValue = AccountFeature | AccountNames | FeedFilterSettings | StringNumberDict |
    ServerFeature |TootURIs | Toot[] | mastodon.v1.Account | number | string;
