import { mastodon } from "masto";
import { chaosFeatureScorer, diversityFeedScorer, favsFeatureScorer, interactsFeatureScorer, numFavoritesScorer, numRepliesScorer, reblogsFeatureScorer, reblogsFeedScorer, topPostFeatureScorer } from "./scorer";
import { condensedStatus } from "./helpers";
import { ScoresType, Toot } from "./types";
import getHomeFeed from "./feeds/homeFeed";
import Paginator from "./Paginator";
declare class TheAlgorithm {
    api: mastodon.rest.Client;
    user: mastodon.v1.Account;
    feed: Toot[];
    fetchers: (typeof getHomeFeed)[];
    featureScorers: (chaosFeatureScorer | favsFeatureScorer | interactsFeatureScorer | numFavoritesScorer | numRepliesScorer | reblogsFeatureScorer | topPostFeatureScorer)[];
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
export { condensedStatus, ScoresType, TheAlgorithm, Toot, };
