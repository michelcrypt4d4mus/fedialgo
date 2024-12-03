import { mastodon } from 'masto';
import Scorer from './scorer/Scorer';


export interface AlgorithmArgs {
    api: mastodon.rest.Client;
    user: mastodon.v1.Account;
    setFeedInApp?: (feed: Toot[]) => void;
}

export interface StringNumberDict {
    [key: string]: number;
};

export type AccountFeature = {
    [key: mastodon.v1.Account["acct"]]: number;
};

export type ServerFeature = {
    [key: mastodon.v1.Instance["uri"]]: number;
};

export type TootURIs = {
    [key: mastodon.v1.Status["uri"]]: mastodon.v1.Status | Toot;
};

export type TootScore = {
    rawScore: number;  // Score before applying timeDecayMultiplier
    rawScores: StringNumberDict;
    score: number;
    timeDecayMultiplier: number;  // Multiplier that reduces the score of older posts
    weightedScores: StringNumberDict;
};

export interface Toot extends mastodon.v1.Status {
    followedTags?: mastodon.v1.Tag[];  // Array of tags that the user follows that exist in this toot
    reblog?: Toot;
    reblogBy?: mastodon.v1.Account;
    recommended?: boolean;
    scoreInfo?: TootScore;
    similarity?: number;
    trendingRank?: number;         // Most trending on a server gets a 10, next is a 9, etc.
};

export type FeedFilterSettings = {
    filteredLanguages: string[];
    includeFollowedHashtags: boolean;
    includeFollowedAccounts: boolean;
    includeReposts: boolean;
    includeReplies: boolean;
    includeTrendingToots: boolean;
    onlyLinks: boolean;
    weightLearningEnabled: boolean;
};

export type ScorerInfo = {
    defaultWeight: number;
    description: string;
    scorer?: Scorer,
};

export type ScorerDict = {
    [key: string]: ScorerInfo;
};

export type FeedFetcher = (api: mastodon.rest.Client) => Promise<Toot[]>;
export type StorageValue = AccountFeature | FeedFilterSettings | StringNumberDict | ServerFeature |
                           TootURIs | Toot[] | mastodon.v1.Account | string;
