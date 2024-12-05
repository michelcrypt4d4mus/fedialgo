import { Config, FeedFilterSettings, ScorerInfo } from "./types";
export declare enum WeightName {
    CHAOS = "Chaos",
    DIVERSITY = "Diversity",
    FAVORITED_ACCOUNTS = "FavoritedAccounts",
    FOLLOWED_TAGS = "FollowedTags",
    IMAGE_ATTACHMENTS = "ImageAttachments",
    INTERACTIONS = "Interactions",
    MOST_REPLIED_ACCOUNTS = "MostRepliedAccounts",
    MOST_RETOOTED_ACCOUNTS = "MostRetootedAccounts",
    NUM_FAVOURITES = "NumFavourites",
    NUM_REPLIES = "NumReplies",
    NUM_RETOOTS = "NumRetoots",
    RETOOTED_IN_FEED = "RetootedInFeed",
    TIME_DECAY = "TimeDecay",
    TRENDING_TAGS = "TrendingTags",
    TRENDING_TOOTS = "TrendingToots",
    VIDEO_ATTACHMENTS = "VideoAttachments"
}
type ScorerInfoDict = {
    [key in WeightName]: ScorerInfo;
};
export declare const DEFAULT_WEIGHTS: ScorerInfoDict;
export declare const DEFAULT_FILTERS: FeedFilterSettings;
export declare const DEFAULT_CONFIG: Config;
export {};
