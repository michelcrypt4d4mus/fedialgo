import BooleanFilterOptionList from './boolean_filter_option_list';
import Toot from '../api/objects/toot';
import TootFilter from "./toot_filter";
import { BooleanFilterName, TypeFilterName } from '../enums';
import { type BooleanFilterOption, type FilterArgs } from "../types";
type TypeFilter = (toot: Toot) => boolean;
export declare const isBooleanFilterName: (value: string) => boolean;
export declare const isTypeFilterName: (value: string) => boolean;
export declare const TYPE_FILTERS: Record<TypeFilterName, TypeFilter>;
export interface BooleanFilterArgs extends FilterArgs {
    selectedOptions?: string[];
    title: BooleanFilterName;
}
export default class BooleanFilter extends TootFilter {
    selectedOptions: string[];
    title: BooleanFilterName;
    private _options;
    get options(): BooleanFilterOptionList;
    set options(optionList: BooleanFilterOptionList);
    constructor({ title, invertSelection, selectedOptions }: BooleanFilterArgs);
    isAllowed(toot: Toot): boolean;
    isOptionEnabled(optionName: string): boolean;
    optionListWithMinToots(options: BooleanFilterOption[], minToots?: number): BooleanFilterOptionList;
    optionsSortedByName(minToots?: number): BooleanFilterOptionList;
    optionsSortedByValue(minToots?: number): BooleanFilterOptionList;
    updateOption(optionName: string, isSelected: boolean): void;
    toArgs(): BooleanFilterArgs;
    static buildBooleanFilterDict<T extends Record<string, number | BooleanFilterOption>>(): Record<BooleanFilterName, T>;
}
export {};
