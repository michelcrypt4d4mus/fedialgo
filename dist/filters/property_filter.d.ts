import Toot from '../api/objects/toot';
import TootFilter from "./toot_filter";
import { FilterArgs, StringNumberDict } from "../types";
type TypeFilter = (toot: Toot) => boolean;
type TypeFilters = Record<TypeFilterName, TypeFilter>;
export declare enum PropertyName {
    TYPE = "type",
    LANGUAGE = "language",
    HASHTAG = "hashtag",
    USER = "user",
    APP = "app",
    SERVER_SIDE_FILTERS = "ServerFilters"
}
export declare enum TypeFilterName {
    AUDIO = "audio",
    DIRECT_MESSAGE = "directMessages",
    FOLLOWED_ACCOUNTS = "followedAccounts",
    FOLLOWED_HASHTAGS = "followedHashtags",
    IMAGES = "images",
    LINKS = "links",
    MENTIONS = "mentions",
    POLLS = "polls",
    PARTICIPATED_HASHTAGS = "participatedHashtags",
    REPLIES = "replies",
    REPOSTS = "reposts",
    SENSITIVE = "sensitive",
    TRENDING_HASHTAGS = "trendingHashtags",
    TRENDING_LINKS = "trendingLinks",
    TRENDING_TOOTS = "trendingToots",
    VIDEOS = "videos"
}
export interface PropertyFilterArgs extends FilterArgs {
    optionInfo?: StringNumberDict;
    validValues?: string[];
}
export declare const TYPE_FILTERS: TypeFilters;
export default class PropertyFilter extends TootFilter {
    title: PropertyName;
    optionInfo: StringNumberDict;
    effectiveOptionInfo: StringNumberDict;
    validValues: string[];
    visible: boolean;
    constructor({ title, invertSelection, optionInfo, validValues }: PropertyFilterArgs);
    isAllowed(toot: Toot): boolean;
    setOptions(optionInfo: StringNumberDict): void;
    updateValidOptions(element: string, isValidOption: boolean): void;
    toArgs(): PropertyFilterArgs;
}
export {};
