import { mastodon } from "masto";
import { Mutex } from 'async-mutex';
import getHomeFeed from "./feeds/homeFeed";
import MastodonApiCache from "./features/mastodon_api_cache";
import Paginator from "./Paginator";
import { AlgorithmArgs, FeedFilterSettings, ScorerDict, ScoresType, Toot } from "./types";
import { ChaosFeatureScorer, DiversityFeedScorer, FavsFeatureScorer, FollowedTagsFeatureScorer, ImageAttachmentScorer, InteractionsFeatureScorer, NumFavoritesScorer, NumRepliesScorer, ReblogsFeatureScorer, ReblogsFeedScorer, RepliedFeatureScorer, TopPostFeatureScorer, VideoAttachmentScorer } from "./scorer";
declare const NO_LANGUAGE = "[not specified]";
declare const TIME_DECAY = "TimeDecay";
declare class TheAlgorithm {
    api: mastodon.rest.Client;
    user: mastodon.v1.Account;
    filters: FeedFilterSettings;
    feed: Toot[];
    feedLanguages: ScoresType;
    scoreMutex: Mutex;
    setFeedInApp: (f: Toot[]) => void;
    fetchers: (typeof getHomeFeed)[];
    featureScorers: (ChaosFeatureScorer | FavsFeatureScorer | FollowedTagsFeatureScorer | ImageAttachmentScorer | InteractionsFeatureScorer | NumFavoritesScorer | NumRepliesScorer | ReblogsFeatureScorer | RepliedFeatureScorer | TopPostFeatureScorer | VideoAttachmentScorer)[];
    feedScorers: (DiversityFeedScorer | ReblogsFeedScorer)[];
    weightedScorers: (ChaosFeatureScorer | DiversityFeedScorer | FavsFeatureScorer | FollowedTagsFeatureScorer | ImageAttachmentScorer | InteractionsFeatureScorer | NumFavoritesScorer | NumRepliesScorer | ReblogsFeatureScorer | ReblogsFeedScorer | RepliedFeatureScorer | TopPostFeatureScorer | VideoAttachmentScorer)[];
    featureScoreNames: string[];
    feedScoreNames: string[];
    weightedScoreNames: string[];
    scorersDict: ScorerDict;
    static create(params: AlgorithmArgs): Promise<TheAlgorithm>;
    private constructor();
    getFeed(): Promise<Toot[]>;
    updateUserWeights(userWeights: ScoresType): Promise<Toot[]>;
    updateFilters(newFilters: FeedFilterSettings): Promise<Toot[]>;
    getUserWeights(): Promise<ScoresType>;
    filteredFeed(): Toot[];
    list(): Paginator;
    mostRecentTootAt(): Date;
    logFeedInfo(): void;
    learnWeights(tootScores: ScoresType, step?: number): Promise<ScoresType | undefined>;
    private scoreFeed;
    private setDefaultWeights;
    private isFiltered;
    private decorateWithScoreInfo;
    private shouldReloadFeed;
}
export { NO_LANGUAGE, TIME_DECAY, FeedFilterSettings, MastodonApiCache, ScoresType, TheAlgorithm, Toot, };
