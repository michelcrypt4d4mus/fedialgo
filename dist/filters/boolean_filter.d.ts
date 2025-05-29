import Toot from '../api/objects/toot';
import TootFilter from "./toot_filter";
import { FilterArgs, StringNumberDict } from "../types";
type TypeFilter = (toot: Toot) => boolean;
export declare enum BooleanFilterName {
    HASHTAG = "hashtag",
    LANGUAGE = "language",
    TYPE = "type",
    USER = "user",
    APP = "app"
}
export declare enum TypeFilterName {
    AUDIO = "audio",
    BOT = "bot",
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
export declare const isBooleanFilterName: (value: string) => boolean;
export declare const isTypeFilterName: (value: string) => boolean;
export declare const TYPE_FILTERS: Record<TypeFilterName, TypeFilter>;
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
    isThisSelectionEnabled(optionName: string): boolean;
    setOptions(optionInfo: StringNumberDict): void;
    updateValidOptions(element: string, isValidOption: boolean): void;
    toArgs(): BooleanFilterArgs;
}
export {};
