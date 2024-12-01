import { mastodon } from 'masto';
export interface ScoresType {
    [key: string]: number;
}
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
    rawScore: number;
    rawScores: ScoresType;
    score: number;
    timeDecayMultiplier: number;
    weightedScores: ScoresType;
};
export interface Toot extends mastodon.v1.Status {
    condensedStatus?: () => object;
    followedTags?: mastodon.v1.Tag[];
    reblog?: Toot;
    reblogBy?: mastodon.v1.Account;
    recommended?: boolean;
    scoreInfo?: TootScore;
    similarity?: number;
    trendingRank?: number;
}
export type FeedFetcher = (api: mastodon.rest.Client) => Promise<Toot[]>;
export type Scorer = (api: mastodon.rest.Client, status: Toot) => number;
export type StorageValue = AccountFeature | ScoresType | ServerFeature | TagFeature | TootURIs | mastodon.v1.Account | string;
