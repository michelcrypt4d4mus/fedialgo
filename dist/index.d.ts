import { mastodon } from "masto";
import { Mutex } from 'async-mutex';
import ChaosFeatureScorer from "./scorer/feature/chaosFeatureScorer";
import DiversityFeedScorer from "./scorer/feed/diversity_feed_scorer";
import FeedFilterSection, { FilterOptionName, SourceFilterName } from "./objects/feed_filter_section";
import FollowedTagsFeatureScorer from "./scorer/feature/followed_tags_feature_scorer";
import ImageAttachmentScorer from "./scorer/feature/ImageAttachmentScorer";
import InteractionsFeatureScorer from "./scorer/feature/InteractionsFeatureScorer";
import MostFavoritedAccountsScorer from "./scorer/feature/most_favorited_accounts_scorer";
import MostRepliedAccountsScorer from "./scorer/feature/most_replied_accounts_scorer";
import NumFavoritesScorer from "./scorer/feature/num_favorites_scorer";
import NumRepliesScorer from "./scorer/feature/num_replies_scorer";
import NumRetootsScorer from "./scorer/feature/num_retoots_scorer";
import Paginator from "./api/paginator";
import RetootedUsersScorer from "./scorer/feature/retooted_users_scorer";
import RetootsInFeedScorer from "./scorer/feed/retoots_in_feed_scorer";
import TrendingTagsFeatureScorer from "./scorer/feature/trending_tags_scorer";
import TrendingTootFeatureScorer from "./scorer/feature/trending_toots_feature_scorer";
import VideoAttachmentScorer from "./scorer/feature/VideoAttachmentScorer";
import { AccountNames, AlgorithmArgs, FeedFilterSettings, ScorerDict, StringNumberDict, Toot, Weights } from "./types";
import { ScorerInfo } from "./types";
import { WeightName } from "./types";
declare const TIME_DECAY = WeightName.TIME_DECAY;
declare class TheAlgorithm {
    api: mastodon.rest.Client;
    user: mastodon.v1.Account;
    filters: FeedFilterSettings;
    feed: Toot[];
    followedAccounts: AccountNames;
    followedTags: StringNumberDict;
    tagCounts: StringNumberDict;
    scoreMutex: Mutex;
    reloadIfOlderThanMS: number;
    setFeedInApp: (f: Toot[]) => void;
    featureScorers: (ChaosFeatureScorer | FollowedTagsFeatureScorer | ImageAttachmentScorer | InteractionsFeatureScorer | MostFavoritedAccountsScorer | MostRepliedAccountsScorer | NumFavoritesScorer | NumRepliesScorer | NumRetootsScorer | RetootedUsersScorer | TrendingTagsFeatureScorer | TrendingTootFeatureScorer | VideoAttachmentScorer)[];
    feedScorers: (DiversityFeedScorer | RetootsInFeedScorer)[];
    weightedScorers: (ChaosFeatureScorer | DiversityFeedScorer | FollowedTagsFeatureScorer | ImageAttachmentScorer | InteractionsFeatureScorer | MostFavoritedAccountsScorer | MostRepliedAccountsScorer | NumFavoritesScorer | NumRepliesScorer | NumRetootsScorer | RetootedUsersScorer | RetootsInFeedScorer | TrendingTagsFeatureScorer | TrendingTootFeatureScorer | VideoAttachmentScorer)[];
    scorersDict: ScorerDict;
    static create(params: AlgorithmArgs): Promise<TheAlgorithm>;
    private constructor();
    getFeed(numTimelineToots?: number | null): Promise<Toot[]>;
    getUserWeights(): Promise<Weights>;
    updateUserWeights(userWeights: Weights): Promise<Toot[]>;
    getFilters(): FeedFilterSettings;
    updateFilters(newFilters: FeedFilterSettings): Toot[];
    filteredFeed(): Toot[];
    logFeedInfo(prefix?: string): void;
    repairFeedAndExtractSummaryInfo(): void;
    list(): Paginator;
    private setDefaultWeights;
    private scoreFeed;
    private decorateWithScoreInfo;
    private isInTimeline;
    private isValidForFeed;
    private shouldReloadFeed;
    learnWeights(tootScores: Weights, step?: number): Promise<Weights | undefined>;
}
export { TIME_DECAY, FeedFilterSection, FeedFilterSettings, FilterOptionName, ScorerInfo, SourceFilterName, StringNumberDict, TheAlgorithm, Toot, Weights, };
