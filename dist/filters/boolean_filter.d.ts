import ObjWithCountList from '../api/obj_with_counts_list';
import TagList from '../api/tag_list';
import Toot from '../api/objects/toot';
import TootFilter from "./toot_filter";
import { BooleanFilterName, TypeFilterName } from '../enums';
import { type BooleanFilterOption, type FilterArgs, type FilterOptionDataSource } from "../types";
type FilterOptionDataSources = Record<FilterOptionDataSource, ObjWithCountList<BooleanFilterOption> | TagList>;
type TypeFilter = (toot: Toot) => boolean;
export declare class BooleanFilterOptionList extends ObjWithCountList<BooleanFilterOption> {
}
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
    static filterOptionDataSources(): Promise<FilterOptionDataSources>;
    static buildBooleanFilterDict<T extends Record<string, number | BooleanFilterOption>>(): Record<BooleanFilterName, T>;
}
export {};
