import { mastodon } from 'masto';


export type StorageValue = ServerFeature | AccountFeature | mastodon.v1.Account | ScoresType | string;

export interface ScoresType {
    [key: string]: number;
};

export type AccountFeature = {
    [key: mastodon.v1.Account["acct"]]: number;
};

export type ServerFeature = {
    [key: mastodon.v1.Instance["uri"]]: number;
};

export interface StatusType extends mastodon.v1.Status {
    condensedStatus?: () => object;
    rawScore?: number;  // Score before applying timeDiscount
    reblog?: StatusType;
    reblogBy?: string;
    recommended?: boolean;
    similarity?: number;
    scores?: ScoresType;
    timeDiscount?: number;  // Multiplier that reduces the score of older posts
    topPost?: number;
    value?: number;
    weightedScores?: ScoresType;
};

export type FeedFetcher = (api: mastodon.rest.Client) => Promise<StatusType[]>;
export type Scorer = (api: mastodon.rest.Client, status: StatusType) => number;
