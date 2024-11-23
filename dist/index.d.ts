import { mastodon } from "masto";
import { diversityFeedScorer, favsFeatureScorer, interactsFeatureScorer, numFavoritesScorer, numRepliesScorer, reblogsFeatureScorer, reblogsFeedScorer, topPostFeatureScorer } from "./scorer";
import { condensedStatus } from "./helpers";
import { ScoresType, Toot } from "./types";
import chaosFeatureScorer from "./scorer/feature/chaosFeatureScorer";
import getHomeFeed from "./feeds/homeFeed";
import Paginator from "./Paginator";
declare class TheAlgorithm {
    api: mastodon.rest.Client;
    user: mastodon.v1.Account;
    feed: Toot[];
    fetchers: (typeof getHomeFeed)[];
    featureScorers: (favsFeatureScorer | interactsFeatureScorer | numFavoritesScorer | numRepliesScorer | reblogsFeatureScorer | topPostFeatureScorer | chaosFeatureScorer)[];
    feedScorers: (diversityFeedScorer | reblogsFeedScorer)[];
    constructor(api: mastodon.rest.Client, user: mastodon.v1.Account, valueCalculator?: (((scores: ScoresType) => Promise<number>) | null));
    getFeed(): Promise<Toot[]>;
    private _computeFinalScore;
    getScorerNames(): string[];
    setDefaultWeights(): Promise<void>;
    getScoreWeights(): Promise<ScoresType>;
    weightTootsInFeed(userWeights: ScoresType): Promise<Toot[]>;
    getDescription(scorerName: string): string;
    weightAdjust(statusWeights: ScoresType, step?: number): Promise<ScoresType | undefined>;
    list(): Paginator;
    private _getScoreObj;
}
export { condensedStatus, Toot, ScoresType, TheAlgorithm, };
