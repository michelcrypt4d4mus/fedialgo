import { mastodon } from 'masto';


export interface AlgorithmArgs {
    api: mastodon.rest.Client;
    user: mastodon.v1.Account;
    setFeedInApp?: (feed: Toot[]) => void;
}

export interface ScoresType {
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

export type TagFeature = {
    [key: string]: number;
};

export type Description = {
    [key: string]: string;
};

export type TootScore = {
    rawScore: number;  // Score before applying timeDecayMultiplier
    rawScores: ScoresType;
    score: number;
    timeDecayMultiplier: number;  // Multiplier that reduces the score of older posts
    weightedScores: ScoresType;
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
};

export type ScorerDescription = {
    defaultWeight: number;
    description: string;
};

export type ScorerDescriptions = {
    [key: string]: ScorerDescription;
};

export type FeedFetcher = (api: mastodon.rest.Client) => Promise<Toot[]>;
export type StorageValue = AccountFeature | ScoresType | ServerFeature | TagFeature | TootURIs | Toot[] | mastodon.v1.Account | string;
