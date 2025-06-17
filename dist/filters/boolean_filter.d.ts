import Toot from '../api/objects/toot';
import TootFilter, { type FilterArgs } from "./toot_filter";
import { BooleanFilterName, TypeFilterName } from '../enums';
import { BooleanFilterOptionList } from '../api/counted_list';
type TypeFilter = (toot: Toot) => boolean;
export declare const TYPE_FILTERS: Record<TypeFilterName, TypeFilter>;
export interface BooleanFilterArgs extends Omit<FilterArgs, "description"> {
    selectedOptions?: string[];
    propertyName: BooleanFilterName;
}
/**
 * BooleanFilter for filtering toots by boolean criteria (e.g. language, hashtag, type).
 * @augments TootFilter
 * @property {string} [description] - Optional description of the filter for display or documentation purposes.
 * @property {boolean} [invertSelection] - If true, the filter logic is inverted (e.g., exclude instead of include).
 * @property {BooleanFilterOptionList} options - The BooleanFilterOptions available for this filter.
 * @property {BooleanFilterName} propretyName - The BooleanFilterOptions available for this filter.
 * @property {string[]} selectedOptions - The names of the options selected for use in filtering.
 */
export default class BooleanFilter extends TootFilter {
    selectedOptions: string[];
    propertyName: BooleanFilterName;
    get options(): BooleanFilterOptionList;
    private _options;
    /**
     * Set the options list and remove invalid selected options.
     * @param {BooleanFilterOptionList} optionList
     */
    set options(optionList: BooleanFilterOptionList);
    /**
     * @param {BooleanFilterArgs} params - The filter arguments.
     * @param {boolean} [params.invertSelection] - If true, the filter logic is inverted (e.g., exclude instead of include).
     * @param {string[]} [params.selectedOptions] - The selected options.
     * @param {BooleanFilterName} params.propertyName - The property the filter is working with (hashtags/toot type/etc).
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
     * Return options with numToots >= minToots sorted by name (selected options are always included).
     * @param {number} [minToots=0] - Minimum number of toots.
     * @returns {BooleanFilterOptionList}
     */
    optionsSortedByName(minToots?: number): BooleanFilterOptionList;
    /**
     * Return options with numToots >= minToots sorted by numToots (selected options are always included).
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
     * Return only options that have at least minToots or are in selectedOptions.
     * @private
     * @param {BooleanFilterOption[]} options - The options to filter.
     * @param {number} [minToots=0] - Minimum number of toots.
     * @returns {BooleanFilterOptionList}
     */
    private optionListWithMinToots;
    /**
     * Checks if a given property name is a valid numeric filter name.
     * @param {string} name - The property name to check.
     * @returns {boolean} True if the name is a filterable numeric property.
     */
    static isValidFilterProperty(name: string): boolean;
}
export {};
