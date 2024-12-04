import { mastodon } from "masto";
import { Mutex } from 'async-mutex';
import getHomeFeed from "./feeds/homeFeed";
import Paginator from "./Paginator";
import { AccountNames, AlgorithmArgs, FeedFilterSettings, ScorerDict, StringNumberDict, Toot } from "./types";
import { ChaosFeatureScorer, DiversityFeedScorer, FavsFeatureScorer, FollowedTagsFeatureScorer, ImageAttachmentScorer, InteractionsFeatureScorer, NumFavoritesScorer, NumRepliesScorer, ReblogsFeatureScorer, ReblogsFeedScorer, RepliedFeatureScorer, TopPostFeatureScorer, TrendingTagsFeatureScorer, VideoAttachmentScorer } from "./scorer";
declare const TIME_DECAY = "TimeDecay";
declare class TheAlgorithm {
    api: mastodon.rest.Client;
    user: mastodon.v1.Account;
    filters: FeedFilterSettings;
    feed: Toot[];
    followedAccounts: AccountNames;
    feedLanguageCounts: StringNumberDict;
    appCounts: StringNumberDict;
    scoreMutex: Mutex;
    setFeedInApp: (f: Toot[]) => void;
    fetchers: (typeof getHomeFeed)[];
    featureScorers: (ChaosFeatureScorer | FavsFeatureScorer | FollowedTagsFeatureScorer | ImageAttachmentScorer | InteractionsFeatureScorer | NumFavoritesScorer | NumRepliesScorer | ReblogsFeatureScorer | RepliedFeatureScorer | TopPostFeatureScorer | TrendingTagsFeatureScorer | VideoAttachmentScorer)[];
    feedScorers: (DiversityFeedScorer | ReblogsFeedScorer)[];
    weightedScorers: (ChaosFeatureScorer | DiversityFeedScorer | FavsFeatureScorer | FollowedTagsFeatureScorer | ImageAttachmentScorer | InteractionsFeatureScorer | NumFavoritesScorer | NumRepliesScorer | ReblogsFeatureScorer | ReblogsFeedScorer | RepliedFeatureScorer | TopPostFeatureScorer | TrendingTagsFeatureScorer | VideoAttachmentScorer)[];
    scorersDict: ScorerDict;
    static create(params: AlgorithmArgs): Promise<TheAlgorithm>;
    private constructor();
    getFeed(): Promise<Toot[]>;
    updateUserWeights(userWeights: StringNumberDict): Promise<Toot[]>;
    updateFilters(newFilters: FeedFilterSettings): Promise<Toot[]>;
    getUserWeights(): Promise<StringNumberDict>;
    filteredFeed(): Toot[];
    mostRecentTootAt(): Date;
    logFeedInfo(prefix?: string): void;
    learnWeights(tootScores: StringNumberDict, step?: number): Promise<StringNumberDict | undefined>;
    repairFeedAndExtractSummaryInfo(): void;
    list(): Paginator;
    private setDefaultWeights;
    private scoreFeed;
    private decorateWithScoreInfo;
    private isFiltered;
    private isValidForFeed;
    private shouldReloadFeed;
}
export { TIME_DECAY, FeedFilterSettings, StringNumberDict, TheAlgorithm, Toot, };
