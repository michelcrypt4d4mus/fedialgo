/**
 * Put a minimum number on things like reblogs and replies.
 */
import Toot from '../api/objects/toot';
import TootFilter, { type FilterArgs } from "./toot_filter";
import { type TootNumberProp } from "../types";
export declare const FILTERABLE_SCORES: TootNumberProp[];
/**
 * Arguments for constructing a NumericFilter.
 * @extends FilterArgs
 * @property {number} [value] - The minimum value for the filter.
 */
export interface NumericFilterArgs extends FilterArgs {
    value?: number;
}
/**
 * Filter for numeric properties of a Toot (e.g., replies, reblogs, favourites).
 * Allows filtering toots based on a minimum value for a given property.
 *
 * @extends TootFilter
 * @property {string} [description] - Optional description of the filter for display or documentation purposes.
 * @property {boolean} [invertSelection] - If true, the filter logic is inverted (e.g., exclude instead of include).
 * @property {TootNumberProp} title - The property of the toot to filter on (e.g., 'repliesCount').
 * @property {number} value - The minimum value required for the toot property for the toot to be included in the timeline.
 */
export default class NumericFilter extends TootFilter {
    title: TootNumberProp;
    value: number;
    /**
     * @param {NumericFilterArgs} params - The filter arguments.
     */
    constructor(params: NumericFilterArgs);
    /**
     * Check if the toot meets the filter criterion.
     * @param {Toot} toot - The toot to check.
     * @returns {boolean} True if the toot should appear in the timeline feed.
     */
    isAllowed(toot: Toot): boolean;
    /**
     * Serializes the filter state for storage (e.g., local storage).
     * @returns {NumericFilterArgs} Arguments that can be used to reconstruct the filter.
     */
    toArgs(): NumericFilterArgs;
    /**
     * Updates the value of the filter.
     * @param {number} newValue - The new minimum value for the filter.
     */
    updateValue(newValue: number): void;
    /**
     * Checks if a given property name is a valid numeric filter name.
     * @param {string} name - The property name to check.
     * @returns {boolean} True if the name is a filterable numeric property.
     */
    static isValidTitle(name: string): boolean;
}
