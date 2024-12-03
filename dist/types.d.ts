import { mastodon } from 'masto';
export interface AlgorithmArgs {
    api: mastodon.rest.Client;
    user: mastodon.v1.Account;
    setFeedInApp?: (feed: Toot[]) => void;
}
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
export type Description = {
    [key: string]: string;
};
export type TootScore = {
    rawScore: number;
    rawScores: ScoresType;
    score: number;
    timeDecayMultiplier: number;
    weightedScores: ScoresType;
};
export interface Toot extends mastodon.v1.Status {
    followedTags?: mastodon.v1.Tag[];
    reblog?: Toot;
    reblogBy?: mastodon.v1.Account;
    recommended?: boolean;
    scoreInfo?: TootScore;
    similarity?: number;
    trendingRank?: number;
}
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
export type StorageValue = AccountFeature | FeedFilterSettings | ScoresType | ServerFeature | TagFeature | TootURIs | Toot[] | mastodon.v1.Account | string;
