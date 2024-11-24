import { mastodon } from "masto";
import { diversityFeedScorer, reblogsFeedScorer } from "./scorer";
import { condensedStatus, extractScoreInfo } from "./helpers";
import { ScoresType, Toot } from "./types";
import getHomeFeed from "./feeds/homeFeed";
import Paginator from "./Paginator";
declare class TheAlgorithm {
    api: mastodon.rest.Client;
    user: mastodon.v1.Account;
    feed: Toot[];
    fetchers: (typeof getHomeFeed)[];
    featureScorers: any[];
    feedScorers: (diversityFeedScorer | reblogsFeedScorer)[];
    constructor(api: mastodon.rest.Client, user: mastodon.v1.Account, valueCalculator?: (((scores: ScoresType) => Promise<number>) | null));
    getFeed(): Promise<Toot[]>;
    getScorerNames(): string[];
    setDefaultWeights(): Promise<void>;
    getUserWeights(): Promise<ScoresType>;
    weightTootsInFeed(userWeights: ScoresType): Promise<Toot[]>;
    getDescription(scorerName: string): string;
    learnWeights(tootScores: ScoresType, step?: number): Promise<ScoresType | undefined>;
    list(): Paginator;
    private _computeFinalScore;
    private _getScoreObj;
}
export { condensedStatus, extractScoreInfo, ScoresType, TheAlgorithm, Toot, };
