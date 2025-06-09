import { BooleanFilterOptionList } from '../api/obj_with_counts_list';
import TagList from '../api/tag_list';
import Toot from '../api/objects/toot';
import TootFilter from "./toot_filter";
import { BooleanFilterName, TypeFilterName } from '../enums';
import { type BooleanFilterOption, type FilterArgs, type FilterOptionDataSource } from "../types";
type FilterOptionDataSources = Record<FilterOptionDataSource, BooleanFilterOptionList | TagList>;
/**
 * Function type for matching a toot based on a filter for what type of Toot it is.
 * @callback TypeFilter
 * @param {Toot} toot - The toot to check.
 * @returns {boolean} True if the toot matches the type.
 */
type TypeFilter = (toot: Toot) => boolean;
export declare const isBooleanFilterName: (value: string) => boolean;
export declare const isTypeFilterName: (value: string) => boolean;
/**
 * Type-based filters for toots. Defining a new filter just requires adding a new TypeFilterName
 * and a function that matches the toot.
 * @type {Record<TypeFilterName, TypeFilter>}
 */
export declare const TYPE_FILTERS: Record<TypeFilterName, TypeFilter>;
/**
 * Arguments for BooleanFilter constructor.
 * @typedef {object} BooleanFilterArgs
 * @property {string[]} [selectedOptions] - The selected options.
 * @property {BooleanFilterName} title - The filter title.
 */
export interface BooleanFilterArgs extends FilterArgs {
    selectedOptions?: string[];
    title: BooleanFilterName;
}
/**
 * BooleanFilter for filtering toots by boolean criteria (e.g. language, hashtag, type).
 * @extends TootFilter
 */
export default class BooleanFilter extends TootFilter {
    /**
     * Which options are selected for use in the filter.
     * @type {string[]}
     */
    selectedOptions: string[];
    /**
     * The filter title/category.
     * @type {BooleanFilterName}
     */
    title: BooleanFilterName;
    /**
     * Get the current options list.
     * @returns {BooleanFilterOptionList}
     */
    get options(): BooleanFilterOptionList;
    private _options;
    /**
     * Set the options list and remove invalid selected options.
     * @param {BooleanFilterOptionList} optionList
     */
    set options(optionList: BooleanFilterOptionList);
    constructor({ title, invertSelection, selectedOptions }: BooleanFilterArgs);
    /**
     * Return true if the toot matches the filter.
     * @param {Toot} toot - The toot to check.
     * @returns {boolean}
     */
    isAllowed(toot: Toot): boolean;
    /**
     * Return true if the option is in selectedOptions.
     * @param {string} optionName - The option name.
     * @returns {boolean}
     */
    isOptionEnabled(optionName: string): boolean;
    /**
     * Return only options that have at least minToots or are in selectedOptions.
     * @param {BooleanFilterOption[]} options - The options to filter.
     * @param {number} [minToots=0] - Minimum number of toots.
     * @returns {BooleanFilterOptionList}
     */
    optionListWithMinToots(options: BooleanFilterOption[], minToots?: number): BooleanFilterOptionList;
    /**
     * Return options sorted by name, filtered by minToots (selected options are always included).
     * @param {number} [minToots=0] - Minimum number of toots.
     * @returns {BooleanFilterOptionList}
     */
    optionsSortedByName(minToots?: number): BooleanFilterOptionList;
    /**
     * Return options sorted by numToots, filtered by minToots.
     * @param {number} [minToots=0] - Minimum number of toots.
     * @returns {BooleanFilterOptionList}
     */
    optionsSortedByValue(minToots?: number): BooleanFilterOptionList;
    /**
     * Add or remove an option from the filter.
     * @param {string} optionName - The option name.
     * @param {boolean} isSelected - If true, add the option; if false, remove it.
     */
    updateOption(optionName: string, isSelected: boolean): void;
    /**
     * Required for serialization of settings to local storage.
     * @returns {BooleanFilterArgs}
     */
    toArgs(): BooleanFilterArgs;
    /**
     * Collate all the data sources that are used to populate properties of the same name for each BooleanFilterOption.
     * Note this won't be completely up to date but should be good enough for most purposes.
     * TODO: currently unused
     * @returns {Promise<FilterOptionDataSources>}
     */
    static filterOptionDataSources(): Promise<FilterOptionDataSources>;
}
export {};
