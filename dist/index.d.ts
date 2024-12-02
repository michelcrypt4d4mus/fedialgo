import { mastodon } from "masto";
import { ChaosFeatureScorer, DiversityFeedScorer, FavsFeatureScorer, FollowedTagsFeatureScorer, ImageAttachmentScorer, InteractionsFeatureScorer, NumFavoritesScorer, NumRepliesScorer, ReblogsFeatureScorer, ReblogsFeedScorer, RepliedFeatureScorer, TopPostFeatureScorer, VideoAttachmentScorer } from "./scorer";
import { ScoresType, Toot } from "./types";
import { TRENDING_TOOTS } from "./scorer/feature/topPostFeatureScorer";
import MastodonApiCache from "./features/mastodon_api_cache";
import getHomeFeed from "./feeds/homeFeed";
import Paginator from "./Paginator";
declare const TIME_DECAY = "TimeDecay";
declare const DEFAULT_TIME_DECAY = 0.05;
declare class TheAlgorithm {
    api: mastodon.rest.Client;
    user: mastodon.v1.Account;
    feed: Toot[];
    fetchers: (typeof getHomeFeed)[];
    featureScorers: (ChaosFeatureScorer | FavsFeatureScorer | FollowedTagsFeatureScorer | ImageAttachmentScorer | InteractionsFeatureScorer | NumFavoritesScorer | NumRepliesScorer | ReblogsFeatureScorer | RepliedFeatureScorer | TopPostFeatureScorer | VideoAttachmentScorer)[];
    feedScorers: (DiversityFeedScorer | ReblogsFeedScorer)[];
    weightedScorers: (ChaosFeatureScorer | DiversityFeedScorer | FavsFeatureScorer | FollowedTagsFeatureScorer | ImageAttachmentScorer | InteractionsFeatureScorer | NumFavoritesScorer | NumRepliesScorer | ReblogsFeatureScorer | ReblogsFeedScorer | RepliedFeatureScorer | TopPostFeatureScorer | VideoAttachmentScorer)[];
    featureScoreNames: string[];
    feedScoreNames: string[];
    weightedScoreNames: string[];
    allScoreNames: string[];
    private constructor();
    static create(api: mastodon.rest.Client, user: mastodon.v1.Account): Promise<TheAlgorithm>;
    getFeed(): Promise<Toot[]>;
    weightTootsInFeed(userWeights: ScoresType): Promise<Toot[]>;
    getUserWeights(): Promise<ScoresType>;
    getDescription(scorerName: string): string;
    learnWeights(tootScores: ScoresType, step?: number): Promise<ScoresType | undefined>;
    list(): Paginator;
    logFeedInfo(): void;
    private scoreFeed;
    setDefaultWeights(): Promise<void>;
    private _decorateWithScoreInfo;
    private sortFeed;
}
export { DEFAULT_TIME_DECAY, TIME_DECAY, TRENDING_TOOTS, MastodonApiCache, ScoresType, TheAlgorithm, Toot, };
