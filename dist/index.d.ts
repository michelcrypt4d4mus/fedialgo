import { mastodon } from "masto";
import { condensedStatus } from "./helpers";
import { StatusType, ScoresType } from "./types";
import { diversityFeedScorer, favsFeatureScorer, interactsFeatureScorer, numFavoritesScorer, numRepliesScorer, reblogsFeatureScorer, reblogsFeedScorer, topPostFeatureScorer } from "./scorer";
import chaosFeatureScorer from "./scorer/feature/chaosFeatureScorer";
import getHomeFeed from "./feeds/homeFeed";
import Paginator from "./Paginator";
declare class TheAlgorithm {
    user: mastodon.v1.Account;
    feed: StatusType[];
    api: mastodon.rest.Client;
    fetchers: (typeof getHomeFeed)[];
    featureScorers: (topPostFeatureScorer | favsFeatureScorer | interactsFeatureScorer | reblogsFeatureScorer | numFavoritesScorer | numRepliesScorer | chaosFeatureScorer)[];
    feedScorers: (diversityFeedScorer | reblogsFeedScorer)[];
    constructor(api: mastodon.rest.Client, user: mastodon.v1.Account, valueCalculator?: (((scores: ScoresType) => Promise<number>) | null));
    getFeed(): Promise<StatusType[]>;
    private _getScoreObj;
    private _computeFinalScore;
    getWeightNames(): string[];
    setDefaultWeights(): Promise<void>;
    getWeightDescriptions(): string[];
    getWeights(): Promise<ScoresType>;
    weightTootsInFeed(userWeights: ScoresType): Promise<StatusType[]>;
    getDescription(verboseName: string): string;
    weightAdjust(statusWeights: ScoresType, step?: number): Promise<ScoresType | undefined>;
    list(): Paginator;
}
export { condensedStatus, StatusType, ScoresType, TheAlgorithm, };
