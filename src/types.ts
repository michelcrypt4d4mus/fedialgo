import { mastodon } from 'masto';


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

export type FeedFetcher = (api: mastodon.rest.Client) => Promise<Toot[]>;
export type Scorer = (api: mastodon.rest.Client, status: Toot) => number;
export type StorageValue = AccountFeature | ScoresType | ServerFeature | TagFeature | TootURIs | mastodon.v1.Account | string;
