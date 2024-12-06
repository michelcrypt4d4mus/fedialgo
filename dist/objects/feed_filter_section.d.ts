import { Toot } from "../types";
export declare enum FilterOptionName {
    SOURCE = "source",
    LANGUAGE = "language",
    HASHTAG = "hashtag",
    APP = "app"
}
export declare enum SourceFilterName {
    FOLLOWED_ACCOUNTS = "followedAccounts",
    FOLLOWED_HASHTAGS = "followedHashtags",
    LINKS = "links",
    REPLIES = "replies",
    REPOSTS = "reposts",
    TRENDING_HASHTAGS = "trendingHashtags",
    TRENDING_TOOTS = "trendingToots"
}
type FilterOptionInfo = Record<string, number>;
type SourceFilter = (toot: Toot) => boolean;
type SourceFilters = Record<SourceFilterName, SourceFilter>;
export declare const SOURCE_FILTERS: SourceFilters;
export interface FeedFilterSectionArgs {
    title: FilterOptionName;
    invertSelection?: boolean;
    optionInfo?: FilterOptionInfo;
    validValues?: string[];
}
export default class FeedFilterSection {
    title: FilterOptionName;
    description: string;
    invertSelection: boolean;
    optionInfo: FilterOptionInfo;
    validValues: string[];
    constructor({ title, invertSelection, optionInfo, validValues }: FeedFilterSectionArgs);
    isAllowed(toot: Toot): boolean;
    updateValidOptions(element: string, isValidOption: boolean): void;
    toArgs(): FeedFilterSectionArgs;
}
export {};
