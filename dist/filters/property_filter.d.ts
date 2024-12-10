import Toot from '../api/objects/toot';
import TootFilter from "./toot_filter";
import { FilterArgs, StringNumberDict } from "../types";
type SourceFilter = (toot: Toot) => boolean;
type SourceFilters = Record<SourceFilterName, SourceFilter>;
export declare enum PropertyName {
    SOURCE = "source",
    LANGUAGE = "language",
    HASHTAG = "hashtag",
    USER = "user",
    APP = "app",
    SERVER_SIDE_FILTERS = "serverFilters"
}
export declare enum SourceFilterName {
    DIRECT_MESSAGE = "directMessage",
    FOLLOWED_ACCOUNTS = "followedAccounts",
    FOLLOWED_HASHTAGS = "followedHashtags",
    LINKS = "links",
    REPLIES = "replies",
    REPOSTS = "reposts",
    TRENDING_HASHTAGS = "trendingHashtags",
    TRENDING_TOOTS = "trendingToots"
}
export interface PropertyFilterArgs extends FilterArgs {
    optionInfo?: StringNumberDict;
    validValues?: string[];
}
export declare const SOURCE_FILTERS: SourceFilters;
export default class PropertyFilter extends TootFilter {
    title: PropertyName;
    optionInfo: StringNumberDict;
    validValues: string[];
    visible: boolean;
    constructor({ title, invertSelection, optionInfo, validValues }: PropertyFilterArgs);
    isAllowed(toot: Toot): boolean;
    setOptions(optionInfo: StringNumberDict): void;
    updateValidOptions(element: string, isValidOption: boolean): void;
    toArgs(): PropertyFilterArgs;
}
export {};
