import { FilterArgs, Toot } from "../types";
type FilterOptionInfo = Record<string, number>;
type SourceFilter = (toot: Toot) => boolean;
type SourceFilters = Record<SourceFilterName, SourceFilter>;
export declare enum PropertyName {
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
export interface PropertyFilterArgs extends FilterArgs {
    optionInfo?: FilterOptionInfo;
    validValues?: string[];
}
export default class PropertyFilter {
    title: PropertyName;
    description: string;
    invertSelection: boolean;
    optionInfo: FilterOptionInfo;
    validValues: string[];
    constructor({ title, invertSelection, optionInfo, validValues }: PropertyFilterArgs);
    isAllowed(toot: Toot): boolean;
    updateValidOptions(element: string, isValidOption: boolean): void;
    toArgs(): PropertyFilterArgs;
}
export {};