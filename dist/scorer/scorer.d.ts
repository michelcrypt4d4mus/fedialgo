import Toot from '../api/objects/toot';
import { ComponentLogger } from '../helpers/log_helpers';
import { type StringNumberDict, type WeightInfo } from "../types";
export declare enum ScoreName {
    ALREADY_SHOWN = "AlreadyShown",
    CHAOS = "Chaos",
    DIVERSITY = "Diversity",
    FAVOURITED_ACCOUNTS = "FavouritedAccounts",
    FAVOURITED_TAGS = "FavouritedTags",
    FOLLOWED_ACCOUNTS = "FollowedAccounts",
    FOLLOWED_TAGS = "FollowedTags",
    IMAGE_ATTACHMENTS = "ImageAttachments",
    INTERACTIONS = "Interactions",
    MENTIONS_FOLLOWED = "MentionsFollowed",
    MOST_REPLIED_ACCOUNTS = "MostRepliedAccounts",
    MOST_RETOOTED_ACCOUNTS = "MostRetootedAccounts",
    NUM_FAVOURITES = "NumFavourites",
    NUM_REPLIES = "NumReplies",
    NUM_RETOOTS = "NumRetoots",
    PARTICIPATED_TAGS = "ParticipatedTags",
    RETOOTED_IN_FEED = "RetootedInFeed",
    TRENDING_LINKS = "TrendingLinks",
    TRENDING_TAGS = "TrendingTags",
    TRENDING_TOOTS = "TrendingToots",
    VIDEO_ATTACHMENTS = "VideoAttachments"
}
export declare enum NonScoreWeightName {
    TIME_DECAY = "TimeDecay",
    TRENDING = "Trending",
    OUTLIER_DAMPENER = "OutlierDampener"
}
export type WeightName = ScoreName | NonScoreWeightName;
export default abstract class Scorer {
    abstract description: string;
    isReady: boolean;
    logger: ComponentLogger;
    name: ScoreName;
    scoreData: StringNumberDict;
    constructor(name: ScoreName);
    getInfo(): WeightInfo;
    score(toot: Toot): Promise<number>;
    abstract _score(_toot: Toot): Promise<number>;
    static scoreToots(toots: Toot[], isScoringFeed?: boolean): Promise<Toot[]>;
    private static decorateWithScoreInfo;
    private static sumScores;
}
