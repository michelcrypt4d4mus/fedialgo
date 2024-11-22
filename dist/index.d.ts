import { mastodon } from "masto";
import { StatusType, weightsType } from "./types";
import { diversityFeedScorer, favsFeatureScorer, interactsFeatureScorer, numFavoritesScorer, numRepliesScorer, reblogsFeatureScorer, reblogsFeedScorer, topPostFeatureScorer } from "./scorer";
import chaosFeatureScorer from "./scorer/feature/chaosFeatureScorer";
import getHomeFeed from "./feeds/homeFeed";
import Paginator from "./Paginator";
export default class TheAlgorithm {
    user: mastodon.v1.Account;
    fetchers: (typeof getHomeFeed)[];
    featureScorers: (topPostFeatureScorer | favsFeatureScorer | interactsFeatureScorer | reblogsFeatureScorer | numFavoritesScorer | numRepliesScorer | chaosFeatureScorer)[];
    feedScorers: (diversityFeedScorer | reblogsFeedScorer)[];
    feed: StatusType[];
    api: mastodon.rest.Client;
    constructor(api: mastodon.rest.Client, user: mastodon.v1.Account, valueCalculator?: (((scores: weightsType) => Promise<number>) | null));
    getFeed(): Promise<StatusType[]>;
    private _getScoreObj;
    private _computeFinalScore;
    getWeightNames(): string[];
    setDefaultWeights(): Promise<void>;
    getWeightDescriptions(): string[];
    getWeights(): Promise<weightsType>;
    setWeights(weights: weightsType): Promise<StatusType[]>;
    getDescription(verboseName: string): string;
    weightAdjust(statusWeights: weightsType, step?: number): Promise<weightsType | undefined>;
    list(): Paginator;
}
