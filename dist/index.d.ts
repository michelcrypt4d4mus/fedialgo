import { mastodon } from "masto";
import { condensedStatus } from "./helpers";
import { Toot, ScoresType } from "./types";
import { diversityFeedScorer, favsFeatureScorer, interactsFeatureScorer, numFavoritesScorer, numRepliesScorer, reblogsFeatureScorer, reblogsFeedScorer, topPostFeatureScorer } from "./scorer";
import chaosFeatureScorer from "./scorer/feature/chaosFeatureScorer";
import getHomeFeed from "./feeds/homeFeed";
import Paginator from "./Paginator";
declare class TheAlgorithm {
    user: mastodon.v1.Account;
    feed: Toot[];
    api: mastodon.rest.Client;
    fetchers: (typeof getHomeFeed)[];
    featureScorers: (topPostFeatureScorer | favsFeatureScorer | interactsFeatureScorer | numFavoritesScorer | numRepliesScorer | reblogsFeatureScorer | chaosFeatureScorer)[];
    feedScorers: (diversityFeedScorer | reblogsFeedScorer)[];
    constructor(api: mastodon.rest.Client, user: mastodon.v1.Account, valueCalculator?: (((scores: ScoresType) => Promise<number>) | null));
    getFeed(): Promise<Toot[]>;
    private _getScoreObj;
    private _computeFinalScore;
    getWeightNames(): string[];
    setDefaultWeights(): Promise<void>;
    getWeightDescriptions(): string[];
    getWeights(): Promise<ScoresType>;
    weightTootsInFeed(userWeights: ScoresType): Promise<Toot[]>;
    getDescription(verboseName: string): string;
    weightAdjust(statusWeights: ScoresType, step?: number): Promise<ScoresType | undefined>;
    list(): Paginator;
}
export { condensedStatus, Toot, ScoresType, TheAlgorithm, };
