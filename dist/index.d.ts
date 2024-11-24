import { mastodon } from "masto";
import { chaosFeatureScorer, diversityFeedScorer, favsFeatureScorer, InteractionsFeatureScorer, numFavoritesScorer, numRepliesScorer, reblogsFeatureScorer, reblogsFeedScorer, TopPostFeatureScorer } from "./scorer";
import { condensedStatus, extractScoreInfo } from "./helpers";
import { ScoresType, Toot } from "./types";
import getHomeFeed from "./feeds/homeFeed";
import Paginator from "./Paginator";
declare const TIME_DECAY = "timeDecay";
declare const DEFAULT_TIME_DECAY = 0.05;
declare class TheAlgorithm {
    api: mastodon.rest.Client;
    user: mastodon.v1.Account;
    feed: Toot[];
    fetchers: (typeof getHomeFeed)[];
    featureScorers: (chaosFeatureScorer | favsFeatureScorer | InteractionsFeatureScorer | numFavoritesScorer | numRepliesScorer | reblogsFeatureScorer | TopPostFeatureScorer)[];
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
export { DEFAULT_TIME_DECAY, TIME_DECAY, condensedStatus, extractScoreInfo, ScoresType, TheAlgorithm, Toot, };
