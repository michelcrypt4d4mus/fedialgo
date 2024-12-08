import { Mutex } from 'async-mutex';
import { mastodon } from "masto";
import ChaosScorer from "./scorer/feature/chaos_scorer";
import DiversityFeedScorer from "./scorer/feed/diversity_feed_scorer";
import FollowedTagsFeatureScorer from "./scorer/feature/followed_tags_feature_scorer";
import ImageAttachmentScorer from "./scorer/feature/image_attachment_scorer";
import InteractionsScorer from "./scorer/feature/interactions_scorer";
import MostFavoritedAccountsScorer from "./scorer/feature/most_favorited_accounts_scorer";
import MostRepliedAccountsScorer from "./scorer/feature/most_replied_accounts_scorer";
import NumericFilter from "./filters/numeric_filter";
import NumFavoritesScorer from "./scorer/feature/num_favorites_scorer";
import NumRepliesScorer from "./scorer/feature/num_replies_scorer";
import NumRetootsScorer from "./scorer/feature/num_retoots_scorer";
import Paginator from "./api/paginator";
import PropertyFilter, { PropertyName, SourceFilterName } from "./filters/property_filter";
import RetootedUsersScorer from "./scorer/feature/retooted_users_scorer";
import RetootsInFeedScorer from "./scorer/feed/retoots_in_feed_scorer";
import TrendingTagsScorer from "./scorer/feature/trending_tags_scorer";
import TrendingTootScorer from "./scorer/feature/trending_toots_scorer";
import VideoAttachmentScorer from "./scorer/feature/video_attachment_scorer";
import { MastoApi } from "./api/api";
import { AccountNames, AlgorithmArgs, FeedFilterSettings, ScorerDict, ScorerInfo, StringNumberDict, Toot, WeightName, Weights } from "./types";
declare const TIME_DECAY = WeightName.TIME_DECAY;
declare class TheAlgorithm {
    api: mastodon.rest.Client;
    user: mastodon.v1.Account;
    filters: FeedFilterSettings;
    mastoApi: MastoApi;
    feed: Toot[];
    serverSideFilters: mastodon.v2.Filter[];
    followedAccounts: AccountNames;
    followedTags: StringNumberDict;
    scoreMutex: Mutex;
    reloadIfOlderThanMS: number;
    setFeedInApp: (f: Toot[]) => void;
    featureScorers: (ChaosScorer | InteractionsScorer | MostFavoritedAccountsScorer | MostRepliedAccountsScorer | RetootedUsersScorer | FollowedTagsFeatureScorer | ImageAttachmentScorer | NumFavoritesScorer | NumRepliesScorer | NumRetootsScorer | TrendingTagsScorer | TrendingTootScorer | VideoAttachmentScorer)[];
    feedScorers: (DiversityFeedScorer | RetootsInFeedScorer)[];
    weightedScorers: (ChaosScorer | DiversityFeedScorer | InteractionsScorer | MostFavoritedAccountsScorer | MostRepliedAccountsScorer | RetootedUsersScorer | FollowedTagsFeatureScorer | ImageAttachmentScorer | NumFavoritesScorer | NumRepliesScorer | NumRetootsScorer | RetootsInFeedScorer | TrendingTagsScorer | TrendingTootScorer | VideoAttachmentScorer)[];
    scorersDict: ScorerDict;
    static create(params: AlgorithmArgs): Promise<TheAlgorithm>;
    private constructor();
    getFeed(numTimelineToots?: number, maxId?: string): Promise<Toot[]>;
    getUserWeights(): Promise<Weights>;
    updateUserWeights(userWeights: Weights): Promise<Toot[]>;
    getFilters(): FeedFilterSettings;
    updateFilters(newFilters: FeedFilterSettings): Toot[];
    filteredFeed(): Toot[];
    logFeedInfo(prefix?: string): void;
    repairFeedAndExtractSummaryInfo(): void;
    list(): Paginator;
    private maybeGetMoreToots;
    private setDefaultWeights;
    private scoreFeed;
    private isInTimeline;
    private isValidForFeed;
    private logTootCounts;
    private shouldReloadFeed;
    learnWeights(tootScores: Weights, step?: number): Promise<Weights | undefined>;
}
export { TIME_DECAY, FeedFilterSettings, NumericFilter, PropertyFilter, PropertyName, ScorerInfo, SourceFilterName, StringNumberDict, TheAlgorithm, Toot, Weights, };
