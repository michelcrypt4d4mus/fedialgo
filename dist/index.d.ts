import { Mutex } from 'async-mutex';
import { mastodon } from "masto";
import ChaosScorer from "./scorer/feature/chaos_scorer";
import DiversityFeedScorer from "./scorer/feed/diversity_feed_scorer";
import FollowedTagsScorer from "./scorer/feature/followed_tags_scorer";
import ImageAttachmentScorer from "./scorer/feature/image_attachment_scorer";
import InteractionsScorer from "./scorer/feature/interactions_scorer";
import MentionsFollowedScorer from './scorer/feature/mentions_followed_scorer';
import MostFavoritedAccountsScorer from "./scorer/feature/most_favorited_accounts_scorer";
import MostRepliedAccountsScorer from "./scorer/feature/most_replied_accounts_scorer";
import NumericFilter from "./filters/numeric_filter";
import NumFavoritesScorer from "./scorer/feature/num_favorites_scorer";
import NumRepliesScorer from "./scorer/feature/num_replies_scorer";
import NumRetootsScorer from "./scorer/feature/num_retoots_scorer";
import PropertyFilter, { PropertyName, TypeFilterName } from "./filters/property_filter";
import RetootedUsersScorer from "./scorer/feature/retooted_users_scorer";
import RetootsInFeedScorer from "./scorer/feed/retoots_in_feed_scorer";
import Toot from './api/objects/toot';
import TrendingLinksScorer from './scorer/feature/trending_links_scorer';
import TrendingTagsScorer from "./scorer/feature/trending_tags_scorer";
import TrendingTootScorer from "./scorer/feature/trending_toots_scorer";
import VideoAttachmentScorer from "./scorer/feature/video_attachment_scorer";
import { accountNameWithEmojis } from './api/objects/account';
import { AccountNames, AlgorithmArgs, FeedFilterSettings, ScorerDict, ScorerInfo, StringNumberDict, TrendingLink, TrendingTag, WeightName, Weights } from "./types";
declare const TIME_DECAY = WeightName.TIME_DECAY;
declare const TRENDING = WeightName.TRENDING;
declare class TheAlgorithm {
    api: mastodon.rest.Client;
    user: mastodon.v1.Account;
    filters: FeedFilterSettings;
    feed: Toot[];
    followedAccounts: AccountNames;
    followedTags: StringNumberDict;
    mutedAccounts: AccountNames;
    scoreMutex: Mutex;
    serverSideFilters: mastodon.v2.Filter[];
    trendingLinks: TrendingLink[];
    trendingTags: TrendingTag[];
    trendingToots: Toot[];
    setFeedInApp: (f: Toot[]) => void;
    followedTagsScorer: FollowedTagsScorer;
    mentionsFollowedScorer: MentionsFollowedScorer;
    featureScorers: (ChaosScorer | FollowedTagsScorer | ImageAttachmentScorer | InteractionsScorer | MentionsFollowedScorer | MostFavoritedAccountsScorer | MostRepliedAccountsScorer | NumFavoritesScorer | NumRepliesScorer | NumRetootsScorer | RetootedUsersScorer | TrendingLinksScorer | TrendingTagsScorer | TrendingTootScorer | VideoAttachmentScorer)[];
    feedScorers: (DiversityFeedScorer | RetootsInFeedScorer)[];
    weightedScorers: (ChaosScorer | DiversityFeedScorer | FollowedTagsScorer | ImageAttachmentScorer | InteractionsScorer | MentionsFollowedScorer | MostFavoritedAccountsScorer | MostRepliedAccountsScorer | NumFavoritesScorer | NumRepliesScorer | NumRetootsScorer | RetootedUsersScorer | RetootsInFeedScorer | TrendingLinksScorer | TrendingTagsScorer | TrendingTootScorer | VideoAttachmentScorer)[];
    scorersDict: ScorerDict;
    static create(params: AlgorithmArgs): Promise<TheAlgorithm>;
    private constructor();
    getFeed(numTimelineToots?: number, maxId?: string): Promise<Toot[]>;
    getUserWeights(): Promise<Weights>;
    updateUserWeights(userWeights: Weights): Promise<Toot[]>;
    getFilters(): FeedFilterSettings;
    updateFilters(newFilters: FeedFilterSettings): Toot[];
    filterFeed(): Toot[];
    logFeedInfo(prefix?: string): void;
    extractSummaryInfo(): void;
    mostRecentTootAt(): Date | null;
    buildTagURL(tag: mastodon.v1.Tag): string;
    private maybeGetMoreToots;
    private setDefaultWeights;
    private scoreFeed;
    private logTootCounts;
}
export { TIME_DECAY, TRENDING, FeedFilterSettings, NumericFilter, PropertyFilter, PropertyName, ScorerInfo, StringNumberDict, TheAlgorithm, Toot, TypeFilterName, WeightName, Weights, accountNameWithEmojis, };
