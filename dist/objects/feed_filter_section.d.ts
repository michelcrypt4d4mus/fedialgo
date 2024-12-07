import { Toot, WeightName } from "../types";
type FilterOptionInfo = Record<string, number>;
type SourceFilter = (toot: Toot) => boolean;
type SourceFilters = Record<SourceFilterName, SourceFilter>;
export declare enum FilterOptionName {
    SOURCE = "source",
    LANGUAGE = "language",
    HASHTAG = "hashtag",
    USER = "user",
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
export declare const SOURCE_FILTERS: SourceFilters;
export type FilterArgs = {
    title: FilterOptionName | WeightName;
    invertSelection?: boolean;
};
export interface FeedFilterSectionArgs extends FilterArgs {
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
