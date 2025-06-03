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
    DIRECT_MESSAGE = "direct messages",
    FOLLOWED_ACCOUNTS = "followed accounts",
    FOLLOWED_HASHTAGS = "followed hashtags",
    IMAGES = "images",
    LINKS = "links",
    MENTIONS = "mentions",
    PARTICIPATED_TAGS = "participated hashtags",
    POLLS = "polls",
    PRIVATE = "private",
    REPLIES = "replies",
    RETOOTS = "retoots",
    SENSITIVE = "sensitive",
    SPOILERED = "spoilered",
    TRENDING_LINKS = "trending links",
    TRENDING_TAGS = "trending hashtags",
    TRENDING_TOOTS = "trending toots",
    VIDEOS = "videos"
}
export declare const isBooleanFilterName: (value: string) => boolean;
export declare const isTypeFilterName: (value: string) => boolean;
export declare const TYPE_FILTERS: Record<TypeFilterName, TypeFilter>;
export interface BooleanFilterArgs extends FilterArgs {
    selectedOptions?: string[];
}
export default class BooleanFilter extends TootFilter {
    options: BooleanFilterOptionList;
    selectedOptions: string[];
    title: BooleanFilterName;
    visible: boolean;
    constructor({ title, invertSelection, selectedOptions }: BooleanFilterArgs);
    isAllowed(toot: Toot): boolean;
    isOptionEnabled(optionName: string): boolean;
    optionListWithMinToots(options: BooleanFilterOption[], minToots?: number): BooleanFilterOptionList;
    optionsSortedByName(minToots?: number): BooleanFilterOptionList;
    optionsSortedByValue(minToots?: number): BooleanFilterOptionList;
    setOptions(optionInfo: StringNumberDict): Promise<void>;
    updateValidOptions(element: string, isValidOption: boolean): void;
    toArgs(): BooleanFilterArgs;
}
export {};
