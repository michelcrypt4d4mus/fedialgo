import { mastodon } from "masto";
import { Mutex } from 'async-mutex';
import { ChaosFeatureScorer, DiversityFeedScorer, FavsFeatureScorer, FeatureScorer, FeedScorer, FollowedTagsFeatureScorer, ImageAttachmentScorer, InteractionsFeatureScorer, NumFavoritesScorer, NumRepliesScorer, ReblogsFeatureScorer, ReblogsFeedScorer, RepliedFeatureScorer, TopPostFeatureScorer, VideoAttachmentScorer } from "./scorer";
import { Description, FeedFilterSettings, ScoresType, Toot } from "./types";
import MastodonApiCache from "./features/mastodon_api_cache";
import getHomeFeed from "./feeds/homeFeed";
import Paginator from "./Paginator";
declare const NO_LANGUAGE = "[not specified]";
declare const TIME_DECAY = "TimeDecay";
type ScorerDict = {
    [key: string]: FeedScorer | FeatureScorer;
};
declare class TheAlgorithm {
    api: mastodon.rest.Client;
    user: mastodon.v1.Account;
    filters: FeedFilterSettings;
    feed: Toot[];
    feedLanguages: ScoresType;
    scoreMutex: Mutex;
    fetchers: (typeof getHomeFeed)[];
    featureScorers: (ChaosFeatureScorer | FavsFeatureScorer | FollowedTagsFeatureScorer | ImageAttachmentScorer | InteractionsFeatureScorer | NumFavoritesScorer | NumRepliesScorer | ReblogsFeatureScorer | RepliedFeatureScorer | TopPostFeatureScorer | VideoAttachmentScorer)[];
    feedScorers: (DiversityFeedScorer | ReblogsFeedScorer)[];
    weightedScorers: (ChaosFeatureScorer | DiversityFeedScorer | FavsFeatureScorer | FollowedTagsFeatureScorer | ImageAttachmentScorer | InteractionsFeatureScorer | NumFavoritesScorer | NumRepliesScorer | ReblogsFeatureScorer | ReblogsFeedScorer | RepliedFeatureScorer | TopPostFeatureScorer | VideoAttachmentScorer)[];
    featureScoreNames: string[];
    feedScoreNames: string[];
    weightedScoreNames: string[];
    allScoreNames: string[];
    scorerDescriptions: Description;
    scorersDict: ScorerDict;
    private defaultWeightings;
    private constructor();
    static create(api: mastodon.rest.Client, user: mastodon.v1.Account): Promise<TheAlgorithm>;
    getFeed(): Promise<Toot[]>;
    weightTootsInFeed(userWeights: ScoresType): Promise<Toot[]>;
    getUserWeights(): Promise<ScoresType>;
    learnWeights(tootScores: ScoresType, step?: number): Promise<ScoresType | undefined>;
    filteredFeed(): Toot[];
    list(): Paginator;
    logFeedInfo(): void;
    private scoreFeed;
    private setDefaultWeights;
    private isFiltered;
    private _decorateWithScoreInfo;
    private sortFeed;
}
export { NO_LANGUAGE, TIME_DECAY, FeedFilterSettings, MastodonApiCache, ScoresType, TheAlgorithm, Toot, };
