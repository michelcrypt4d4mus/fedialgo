import BooleanFilterOptionList from './boolean_filter_option_list';
import Toot from '../api/objects/toot';
import TootFilter from "./toot_filter";
import { type BooleanFilterOption, type FilterArgs, type StringNumberDict } from "../types";
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
    PARTICIPATED_TAGS = "participatedHashtags",
    POLLS = "polls",
    PRIVATE = "private",
    REPLIES = "replies",
    RETOOTS = "retoots",
    SENSITIVE = "sensitive",
    SPOILERED = "spoilered",
    TRENDING_LINKS = "trendingLinks",
    TRENDING_TAGS = "trendingHashtags",
    TRENDING_TOOTS = "trendingToots",
    VIDEOS = "videos"
}
export declare const isBooleanFilterName: (value: string) => boolean;
export declare const isTypeFilterName: (value: string) => boolean;
export declare const TYPE_FILTERS: Record<TypeFilterName, TypeFilter>;
export interface BooleanFilterArgs extends FilterArgs {
    optionInfo?: BooleanFilterOption[];
    validValues?: string[];
}
export default class BooleanFilter extends TootFilter {
    optionInfo: BooleanFilterOptionList;
    title: BooleanFilterName;
    validValues: string[];
    visible: boolean;
    constructor({ title, invertSelection, optionInfo, validValues }: BooleanFilterArgs);
    entriesSortedByValue(): [string, number][];
    objsSortedByValue(): BooleanFilterOption[];
    isAllowed(toot: Toot): boolean;
    isThisSelectionEnabled(optionName: string): boolean;
    optionsSortedByValue(minValue?: number): string[];
    setOptions(optionInfo: StringNumberDict): Promise<void>;
    updateValidOptions(element: string, isValidOption: boolean): void;
    toArgs(): BooleanFilterArgs;
}
export {};
