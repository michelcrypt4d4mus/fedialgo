import Toot from '../api/objects/toot';
import TootFilter from "./toot_filter";
import { FilterArgs, StringNumberDict } from "../types";
type TypeFilter = (toot: Toot) => boolean;
type TypeFilters = Record<TypeFilterName, TypeFilter>;
export declare enum BooleanFilterName {
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
    PRIVATE = "private",
    REPLIES = "replies",
    RETOOTS = "retoots",
    SENSITIVE = "sensitive",
    SPOILERED = "spoilered",
    TRENDING_HASHTAGS = "trendingHashtags",
    TRENDING_LINKS = "trendingLinks",
    TRENDING_TOOTS = "trendingToots",
    VIDEOS = "videos"
}
export declare const TYPE_FILTERS: TypeFilters;
export interface BooleanFilterArgs extends FilterArgs {
    optionInfo?: StringNumberDict;
    validValues?: string[];
}
export default class BooleanFilter extends TootFilter {
    title: BooleanFilterName;
    optionInfo: StringNumberDict;
    effectiveOptionInfo: StringNumberDict;
    validValues: string[];
    visible: boolean;
    constructor({ title, invertSelection, optionInfo, validValues }: BooleanFilterArgs);
    isAllowed(toot: Toot): boolean;
    setOptions(optionInfo: StringNumberDict): void;
    updateValidOptions(element: string, isValidOption: boolean): void;
    toArgs(): BooleanFilterArgs;
}
export {};
