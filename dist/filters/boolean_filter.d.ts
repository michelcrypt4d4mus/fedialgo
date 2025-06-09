/**
 * Feed filtering information related to a single criterion on which toots
 * can be filtered inclusively or exclusively based on an array of strings
 * (e.g. language, hashtag, type of toot).
 * @module Filters
 */
import BooleanFilterOptionList from "../api/boolean_filter_option_list";
import TagList from '../api/tag_list';
import Toot from '../api/objects/toot';
import TootFilter, { type FilterArgs } from "./toot_filter";
import { BooleanFilterName, TypeFilterName } from '../enums';
import { type BooleanFilterOption, type FilterOptionDataSource } from "../types";
type FilterOptionDataSources = Record<FilterOptionDataSource, BooleanFilterOptionList | TagList>;
type TypeFilter = (toot: Toot) => boolean;
export declare const TYPE_FILTERS: Record<TypeFilterName, TypeFilter>;
/**
 * Arguments for BooleanFilter constructor.
 * @interface
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
 * @property {string} [description] - Optional description of the filter for display or documentation purposes.
 * @property {boolean} [invertSelection] - If true, the filter logic is inverted (e.g., exclude instead of include).
 * @property {BooleanFilterOptionList} options - The BooleanFilterOptions available for this filter.
 * @property {string[]} selectedOptions - The names of the options selected for use in filtering.
 */
export default class BooleanFilter extends TootFilter {
    selectedOptions: string[];
    title: BooleanFilterName;
    get options(): BooleanFilterOptionList;
    private _options;
    /**
     * Set the options list and remove invalid selected options.
     * @param {BooleanFilterOptionList} optionList
     */
    set options(optionList: BooleanFilterOptionList);
    /**
     * @param {BooleanFilterArgs} params - The filter arguments.
     */
    constructor(params: BooleanFilterArgs);
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
    /**
     * Checks if a given property name is a valid numeric filter name.
     * @param {string} name - The property name to check.
     * @returns {boolean} True if the name is a filterable numeric property.
     */
    static isValidTitle(name: string): boolean;
}
export {};
