import { mastodon } from 'masto';

export type StorageValue = serverFeatureType | accFeatureType | mastodon.v1.Account | weightsType | string;

export interface weightsType {
    [key: string]: number; // Replace 'any' with the desired value type (e.g., string, number, etc.)
};

export type accFeatureType = {
    [key: mastodon.v1.Account["acct"]]: number; // Replace 'any' with the desired value type (e.g., string, number, etc.)
};

export type serverFeatureType = {
    [key: mastodon.v1.Instance["uri"]]: number; // Replace 'any' with the desired value type (e.g., string, number, etc.)
};

export interface StatusType extends mastodon.v1.Status {
    rawScore?: number;  // Score before applying timeDiscount
    reblog?: StatusType;
    reblogBy?: string;
    recommended?: boolean;
    similarity?: number;
    scores?: weightsType;
    timeDiscount?: number;  // Multiplier that reduces the score of older posts
    topPost?: boolean;
    value?: number;
    weightedScores?: weightsType;
};

export type FeedFetcher = (api: mastodon.rest.Client) => Promise<StatusType[]>;
export type Scorer = (api: mastodon.rest.Client, status: StatusType) => number;
