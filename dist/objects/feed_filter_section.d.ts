import { Toot } from "../types";
export declare enum FilterOptionName {
    LANGUAGE = "language",
    HASHTAG = "hashtag",
    APP = "app"
}
type FilterOption = Record<string, boolean>;
type FilterOptionInfo = Record<string, number>;
export interface FeedFilterSectionArgs {
    title: FilterOptionName;
    description?: string;
    invertSelection?: boolean;
    options?: FilterOption;
    optionInfo?: FilterOptionInfo;
    validValues?: string[];
}
export default class FeedFilterSection {
    title: FilterOptionName;
    description: string;
    invertSelection: boolean;
    options: FilterOption;
    optionInfo: FilterOptionInfo;
    validValues: string[];
    constructor({ title, description, invertSelection, options, optionInfo, validValues }: FeedFilterSectionArgs);
    static createForOptions(title: FilterOptionName, options: string[]): FeedFilterSection;
    setOptions(options: string[]): void;
    setOptionsWithInfo(optionInfo: FilterOptionInfo): void;
    isAllowed(toot: Toot): boolean;
    updateValidOptions(element: string, isValidOption: boolean): void;
    toArgs(): FeedFilterSectionArgs;
}
export {};
