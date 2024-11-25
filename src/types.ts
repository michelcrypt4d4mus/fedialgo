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

export interface Toot extends mastodon.v1.Status {
    condensedStatus?: () => object;
    rawScore?: number;  // Score before applying timeDecayMultiplier
    reblog?: Toot;
    reblogBy?: mastodon.v1.Account;
    recommended?: boolean;
    scores?: ScoresType;
    similarity?: number;
    timeDecayMultiplier?: number;  // Multiplier that reduces the score of older posts
    trendingRank?: number;         // Most trending on a server gets a 10, next is a 9, etc.
    value?: number;
    weightedScores?: ScoresType;
};

export type FeedFetcher = (api: mastodon.rest.Client) => Promise<Toot[]>;
export type Scorer = (api: mastodon.rest.Client, status: Toot) => number;
export type StorageValue = ServerFeature | AccountFeature | mastodon.v1.Account | ScoresType | string;
